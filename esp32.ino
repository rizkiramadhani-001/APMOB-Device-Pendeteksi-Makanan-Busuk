#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <Preferences.h>
#include "esp_bt.h"

// =====================================
// UUID CONFIGURATION (MATCHES FRONTEND)
// =====================================
#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define WIFI_CHARACTERISTIC_UUID "d1a9a1f2-7b68-4c13-9c3e-1f3a5e7d9b24"
#define WIFI_STATUS_CHARACTERISTIC_UUID "e2b0b2f3-8c79-4d24-ad4f-2a4b6f8e0c35"

// =====================================
// SENSOR PINS
// =====================================
#define MQ4_PIN 34
#define MQ135_PIN 35
#define DHT_PIN 14
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);
Preferences preferences;
WiFiClientSecure client; // Instantiated globally to completely eliminate heap fragmentation & SSL memory leaks

// =====================================
// GLOBAL VARIABLES
// =====================================
BLEServer *pServer = NULL;
BLECharacteristic *pCharacteristic = NULL;
BLECharacteristic *pWifiCharacteristic = NULL;
BLECharacteristic *pWifiStatusCharacteristic = NULL;

bool deviceConnected = false;
bool oldDeviceConnected = false;

String wifiSSID = "";
String wifiPassword = "";
String userId = "";
String deviceId = "";

bool wifiConnected = false;
bool shouldConnectWifi = false;

unsigned long lastWifiReportTime = 0;
const unsigned long wifiReportInterval = 10000; // Sending interval (10 seconds)

// =====================================
// SUPABASE REST API
// =====================================
String supabaseUrl = "https://hijdrgyysmurhahdavtu.supabase.co/rest/v1/sensor_history";

// Supabase Service Role JWT Key (bypasses RLS to guarantee autonomous hardware inserts succeed)
String supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpamRy"
    "Z3l5c211cmhhaGRhdnR1Iiwicm9sZSI6InNlcnZp"
    "Y2Vfcm9sZSIsImlhdCI6MTc3NTczMDQwMCwiZXhw"
    "IjoyMDkxMzA2NDAwfQ.WdtSLpE3WCpt0md9eDtls"
    "S0Xa3PPGCjqJ3yBfHGhpuM";

// =====================================
// WIFI STATUS BADGE NOTIFIER
// =====================================
void updateWifiStatus() {
  String status;

  if (WiFi.status() == WL_CONNECTED) {
    status = "CONNECTED:" + WiFi.localIP().toString() + ":" + wifiSSID;
    wifiConnected = true;
  } else if (shouldConnectWifi) {
    status = "CONNECTING";
  } else if (wifiSSID.length() > 0) {
    status = "DISCONNECTED:" + wifiSSID;
    wifiConnected = false;
  } else {
    status = "NOT_CONFIGURED";
    wifiConnected = false;
  }

  if (pWifiStatusCharacteristic != NULL) {
    pWifiStatusCharacteristic->setValue(status.c_str());
    pWifiStatusCharacteristic->notify();
  }
  Serial.println("WiFi Status BLE Sent: " + status);
}

// =====================================
// UTILITY: STRING SPLITTER
// =====================================
String getValueAtIndex(String data, char separator, int index) {
  int found = 0;
  int strIndex[] = {0, -1};
  int maxIndex = data.length() - 1;

  for (int i = 0; i <= maxIndex && found <= index; i++) {
    if (data.charAt(i) == separator || i == maxIndex) {
      found++;
      strIndex[0] = strIndex[1] + 1;
      strIndex[1] = (i == maxIndex) ? i + 1 : i;
    }
  }
  return found > index ? data.substring(strIndex[0], strIndex[1]) : "";
}

// =====================================
// SUPABASE: FETCH USER ID
// =====================================
void fetchUserIdFromSupabase() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Supabase] Cannot fetch user ID: WiFi not connected");
    return;
  }
  if (deviceId.length() == 0) {
    Serial.println("[Supabase] Cannot fetch user ID: Device ID is empty");
    return;
  }

  Serial.println("[Supabase] Fetching registered user ID for Device ID: " + deviceId);
  
  HTTPClient http;
  http.useHTTP10(true);
  http.setTimeout(10000);

  // Construct URL to select user_id for this device_id
  String selectUrl = "https://hijdrgyysmurhahdavtu.supabase.co/rest/v1/registered_devices?device_id=eq." + deviceId + "&select=user_id";

  bool ok = http.begin(client, selectUrl);
  if (!ok) {
    Serial.println("[Supabase] HTTP secure session initialization failed for fetch!");
    return;
  }

  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + supabaseKey);

  int httpCode = http.GET();
  Serial.print("[Supabase] Fetch HTTP Code: ");
  Serial.println(httpCode);

  if (httpCode == 200) {
    String response = http.getString();
    Serial.println("[Supabase] Fetch Response: " + response);

    // Response format: [{"user_id":"uuid-value-here"}]
    int idx = response.indexOf("\"user_id\":\"");
    if (idx != -1) {
      String fetchedUserId = response.substring(idx + 11, idx + 11 + 36);
      if (fetchedUserId.length() == 36) {
        if (userId != fetchedUserId) {
          userId = fetchedUserId;
          Serial.println("[Supabase] User ID updated from Supabase: " + userId);
          
          // Persist the updated userId in preferences
          preferences.begin("wifi", false);
          preferences.putString("userId", userId);
          preferences.end();
          Serial.println("[Preferences] Saved updated user ID to flash storage.");
        } else {
          Serial.println("[Supabase] User ID is already up-to-date: " + userId);
        }
      } else {
        Serial.println("[Supabase] Parse error: extracted UUID is invalid length: " + fetchedUserId);
      }
    } else {
      Serial.println("[Supabase] Device not found in registered_devices table or no user_id associated.");
    }
  } else {
    Serial.print("[Supabase] Fetch failed: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
  client.stop();
}

// =====================================
// WIFI CONNECT
// =====================================
void connectToWiFi() {
  if (wifiSSID.length() == 0) {
    Serial.println("[WiFi] Connect aborted: SSID is empty");
    return;
  }

  Serial.println("\n[WiFi] Connecting to SSID: " + wifiSSID);
  Serial.flush();

  // Disable auto-reconnect and disconnect any ongoing connection attempt
  // to prevent the 'wifi:sta is connecting, cannot set config' error in newer core versions.
  WiFi.setAutoReconnect(false);
  WiFi.disconnect(false, false);
  delay(100);

  // Begin WiFi connection
  WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());

  int attempts = 0;
  shouldConnectWifi = false;
  
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connection SUCCESSFUL!");
    Serial.print("[WiFi] Local IP: ");
    Serial.println(WiFi.localIP());
    wifiConnected = true;
    
    // Enable auto-reconnect once we have successfully connected
    WiFi.setAutoReconnect(true);
    
    // Always fetch user ID from Supabase on successful connection
    fetchUserIdFromSupabase();
  } else {
    Serial.println("\n[WiFi] Connection FAILED (Timeout reached).");
    wifiConnected = false;
    WiFi.setAutoReconnect(false);
  }

  updateWifiStatus();
}

// =====================================
// BLE WIFI CONFIGURATION CALLBACKS
// =====================================
class WifiCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String value = pCharacteristic->getValue().c_str();
    Serial.println("Received WiFi Config BLE Stream:");
    Serial.println(value);

    // Expected format from React app: SSID:PASSWORD:USER_ID:DEVICE_ID
    wifiSSID = getValueAtIndex(value, ':', 0);
    wifiPassword = getValueAtIndex(value, ':', 1);
    userId = getValueAtIndex(value, ':', 2);
    deviceId = getValueAtIndex(value, ':', 3);

    // Persist credentials in flash storage
    preferences.begin("wifi", false);
    preferences.putString("ssid", wifiSSID);
    preferences.putString("password", wifiPassword);
    preferences.putString("userId", userId);
    preferences.putString("deviceId", deviceId);
    preferences.end();

    Serial.println("Saved credentials to Preferences:");
    Serial.println("SSID: " + wifiSSID);
    Serial.println("User ID: " + userId);
    Serial.println("Device ID: " + deviceId);

    shouldConnectWifi = true;
    updateWifiStatus();
  }
};

// =====================================
// BLE SERVER STATUS CALLBACKS
// =====================================
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) {
    deviceConnected = true;
    Serial.println("BLE Client Connected");
  }

  void onDisconnect(BLEServer *pServer) {
    deviceConnected = false;
    Serial.println("BLE Client Disconnected");
  }
};

// =====================================
// SUPABASE HTTPS DATA POSTING
// =====================================
void sendDataToSupabase() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Database Update Skipped: WiFi not connected");
    return;
  }

  if (userId.length() == 0 || deviceId.length() == 0) {
    Serial.println("Database Update Skipped: Missing registered UserID/DeviceID");
    return;
  }

  Serial.println("\n-------------------------------------");
  Serial.println("PREPARING HTTPS TELEMETRY SEND...");
  Serial.print("Free Heap Memory: ");
  Serial.println(ESP.getFreeHeap());

  // Reading Sensors
  int mq4_value = analogRead(MQ4_PIN);
  int mq135_value = analogRead(MQ135_PIN);
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature(); // Kept for BLE local display if needed

  if (isnan(humidity)) {
    humidity = 0;
  }

  // =====================================
  // JSON PAYLOAD (MATCHES FRONTEND SCHEMA)
  // =====================================
  String jsonPayload = "{";
  jsonPayload += "\"device_id\":\"" + deviceId + "\",";
  jsonPayload += "\"user_id\":\"" + userId + "\",";
  jsonPayload += "\"mq4\":" + String(mq4_value) + ",";
  jsonPayload += "\"mq135\":" + String(mq135_value) + ",";
  jsonPayload += "\"gas\":" + String(mq4_value) + ",";
  jsonPayload += "\"humidity\":" + String(humidity, 1) + ",";
  jsonPayload += "\"temperature\":" + String(mq135_value);
  jsonPayload += "}";

  Serial.println("Constructing JSON Payload:");
  Serial.println(jsonPayload);

  HTTPClient http;
  http.useHTTP10(true);
  http.setTimeout(15000);

  Serial.println("Opening SSL socket session...");
  bool ok = http.begin(client, supabaseUrl);
  
  if (!ok) {
    Serial.println("HTTP secure session initialization failed!");
    return;
  }

  // Add Request Headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + supabaseKey);
  http.addHeader("Prefer", "return=minimal"); // Request a zero-byte response to bypass dynamic heap buffer allocations

  // Post Data
  Serial.println("Sending HTTPS payload...");
  int httpCode = http.POST(jsonPayload);

  Serial.print("HTTP Response Code: ");
  Serial.println(httpCode);

  if (httpCode > 0) {
    Serial.println("--- DB POST SUCCESS ---");
  } else {
    Serial.print("--- DB POST FAILED: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
  client.stop(); // Force-release secure SSL context memory buffers immediately
  Serial.println("-------------------------------------\n");
}

// =====================================
// INITIALIZATION
// =====================================
void setup() {
  // If the Bluetooth hardware controller is already running (e.g. after a CPU Software Reset),
  // we must disable and de-initialize it first to sync the hardware with our clean C++ boot state.
  if (esp_bt_controller_get_status() != ESP_BT_CONTROLLER_STATUS_IDLE) {
    esp_bt_controller_disable();
    esp_bt_controller_deinit();
  }

  // Reclaim RAM on cold boot by releasing Classic Bluetooth memory.
  // We can only release memory if the controller is in IDLE status (not yet initialized).
  if (esp_bt_controller_get_status() == ESP_BT_CONTROLLER_STATUS_IDLE) {
    esp_bt_controller_mem_release(ESP_BT_MODE_CLASSIC_BT);
  }

  Serial.begin(115200);
  delay(100); // Give serial subsystem a moment to stabilize
  Serial.println("\n=== ESP32 HARDWARE DEVICE START ===");

  client.setInsecure(); // Configure our global secure SSL client to bypass chain verification

  // Init Sensors
  dht.begin();
  pinMode(MQ4_PIN, INPUT);
  pinMode(MQ135_PIN, INPUT);

  // =====================================
  // BLE SERVER INIT (INSTANT ACTIVATION)
  // =====================================
  // We initialize the Bluetooth server immediately so that pairing and
  // dashboard scanning work the millisecond the device powers on!
  BLEDevice::init("ESP32_GATT_Server");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(BLEUUID(SERVICE_UUID), 30);

  // Sensor reading notification characteristic
  pCharacteristic = pService->createCharacteristic(
      CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristic->addDescriptor(new BLE2902());

  // WiFi configuration write characteristic
  pWifiCharacteristic = pService->createCharacteristic(
      WIFI_CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_WRITE
  );
  pWifiCharacteristic->setCallbacks(new WifiCallbacks());

  // WiFi connection status characteristic
  pWifiStatusCharacteristic = pService->createCharacteristic(
      WIFI_STATUS_CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pWifiStatusCharacteristic->addDescriptor(new BLE2902());

  pService->start();

  // Start BLE Advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);
  BLEDevice::startAdvertising();
  Serial.println("[BLE] GATT Server & Advertising successfully started!");

  // =====================================
  // WIFI CONFIGURATION & AUTO-CONNECT
  // =====================================
  // Initialize STA mode WiFi with a small safety delay
  delay(150);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false); // Disabled by default on boot; connectToWiFi() will manage it

  // Load Saved WiFi Config from Flash
  preferences.begin("wifi", true);
  wifiSSID = preferences.getString("ssid", "");
  wifiPassword = preferences.getString("password", "");
  userId = preferences.getString("userId", "");
  deviceId = preferences.getString("deviceId", "");
  preferences.end();

  Serial.println("Loaded local configuration: ");
  Serial.println("SSID: " + wifiSSID);
  Serial.println("User ID: " + userId);
  Serial.println("Device ID: " + deviceId);
  Serial.flush(); // Force output transmission before starting connection sequence

  // Attempt auto-connect if credentials exist
  if (wifiSSID.length() > 0) {
    connectToWiFi();
  }
}

// =====================================
// MAIN EVENT LOOP
// =====================================
void loop() {
  // Handle provisioning state connection (only when Bluetooth is NOT connected)
  if (shouldConnectWifi && !deviceConnected) {
    connectToWiFi();
  }

  // Periodic WiFi-to-Supabase Data Push (only when Bluetooth is NOT connected)
  unsigned long currentMillis = millis();
  if (!deviceConnected && WiFi.status() == WL_CONNECTED && (currentMillis - lastWifiReportTime >= wifiReportInterval)) {
    lastWifiReportTime = currentMillis;
    sendDataToSupabase();
  }

  // Local Bluetooth Data Stream (when connected)
  // Uses a non-blocking millis() timer to prevent CPU freezes, allowing network cores to run smoothly.
  static unsigned long lastBleReportTime = 0;
  if (deviceConnected) {
    unsigned long currentMillis = millis();
    if (currentMillis - lastBleReportTime >= 2000) { // 2-second stream interval
      lastBleReportTime = currentMillis;

      int mq4_value = analogRead(MQ4_PIN);
      int mq135_value = analogRead(MQ135_PIN);
      float humidity = dht.readHumidity();

      if (isnan(humidity)) {
        humidity = 0;
      }

      // Format: mq4,mq135,humidity
      String sensorData = String(mq4_value) + "," + String(mq135_value) + "," + String(humidity, 1);
      pCharacteristic->setValue(sensorData.c_str());
      pCharacteristic->notify();
      
      Serial.println("Local BLE Stream Sent: " + sensorData);
    }
  }

  // Handle BLE Client Disconnect
  if (!deviceConnected && oldDeviceConnected) {
    oldDeviceConnected = deviceConnected; // Mark state immediately to prevent re-entry
    Serial.println("BLE Client Disconnected. Re-enabling Wi-Fi with protective transitions...");
    
    // 1. Give BLE stack a moment to clean up and free radio buffers
    delay(200);
    
    // 2. Safely re-initialize Wi-Fi STA mode
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(false);
    
    // 3. Give Wi-Fi driver task time to initialize and allocate resources
    delay(300);
    
    // 4. Safely restart BLE advertising
    pServer->startAdvertising();
    Serial.println("[BLE] Restarted Advertising.");
    
    // 5. Give BLE advertising task time to stabilize on the RF arbiter
    delay(200);
    
    // 6. Schedule Wi-Fi auto-connect if credentials exist
    if (wifiSSID.length() > 0) {
      shouldConnectWifi = true;
    }
  }

  // Handle BLE Client Connect
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected; // Mark state immediately to prevent re-entry
    Serial.println("BLE Connection Established. Disabling Wi-Fi to prioritize BLE...");
    
    // 1. Disconnect Wi-Fi gracefully (without shutting off radio yet)
    WiFi.disconnect(false, false);
    
    // 2. Allow any pending/active packets and TCP sessions to close gracefully
    delay(200);
    
    // 3. Shut down the Wi-Fi radio completely
    WiFi.mode(WIFI_OFF);
    wifiConnected = false;
    
    // 4. Give the hardware RF arbiter time to adapt to single-radio mode
    delay(200);
    
    updateWifiStatus();
  }
}