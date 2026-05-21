#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <DHT.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Preferences.h>

#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define WIFI_CHARACTERISTIC_UUID "d1a9a1f2-7b68-4c13-9c3e-1f3a5e7d9b24"
#define WIFI_STATUS_CHARACTERISTIC_UUID "e2b0b2f3-8c79-4d24-ad4f-2a4b6f8e0c35"

// --- SENSOR PINS ---
// Update these pins according to your ESP32 wiring!
#define MQ4_PIN 32
#define MQ135_PIN 33
#define DHT_PIN 4
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);
Preferences preferences;

BLEServer *pServer = NULL;
BLECharacteristic *pCharacteristic = NULL;
BLECharacteristic *pWifiCharacteristic = NULL;
BLECharacteristic *pWifiStatusCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Config state
String wifiSSID = "";
String wifiPassword = "";
String userId = "";
String deviceId = "";

bool wifiConnected = false;
bool shouldConnectWifi = false;

// Timer for WiFi data reporting
unsigned long lastWifiReportTime = 0;
const unsigned long wifiReportInterval = 10000; // Send data every 10 seconds via WiFi

// Update WiFi status on the BLE characteristic
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
  pWifiStatusCharacteristic->setValue(status.c_str());
  pWifiStatusCharacteristic->notify();
  Serial.println("WiFi Status: " + status);
}

// Helper function to split string by character
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

// Callback for WiFi credential writes
class WifiCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String value = pCharacteristic->getValue().c_str();
    Serial.println("Received BLE config: " + value);

    // Expected format: "SSID:PASSWORD:USER_ID:DEVICE_ID"
    wifiSSID = getValueAtIndex(value, ':', 0);
    wifiPassword = getValueAtIndex(value, ':', 1);
    userId = getValueAtIndex(value, ':', 2);
    deviceId = getValueAtIndex(value, ':', 3);

    // Save to persistent storage
    preferences.begin("wifi", false);
    preferences.putString("ssid", wifiSSID);
    preferences.putString("password", wifiPassword);
    preferences.putString("userId", userId);
    preferences.putString("deviceId", deviceId);
    preferences.end();

    Serial.println("Saved SSID: " + wifiSSID);
    Serial.println("Saved Password: " + wifiPassword);
    Serial.println("Saved UserID: " + userId);
    Serial.println("Saved DeviceID: " + deviceId);

    shouldConnectWifi = true;
    updateWifiStatus();
  }
};

// Callback to handle connection status
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) { deviceConnected = true; };
  void onDisconnect(BLEServer *pServer) { deviceConnected = false; }
};

void connectToWiFi() {
  if (wifiSSID.length() == 0) return;

  Serial.println("Connecting to WiFi: " + wifiSSID);
  WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  shouldConnectWifi = false;

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected! IP: " + WiFi.localIP().toString());
    wifiConnected = true;
  } else {
    Serial.println("\nWiFi connection failed.");
    wifiConnected = false;
  }

  if (deviceConnected) {
    updateWifiStatus();
  }
}

// Function to send data directly to Supabase via WiFi HTTP POST
void sendDataToSupabase() {
  if (WiFi.status() != WL_CONNECTED || userId.length() == 0 || deviceId.length() == 0) {
    return;
  }

  Serial.println("WiFi: Preparing to send data to Supabase...");

  WiFiClientSecure client;
  client.setInsecure(); // Skip SSL certificate validation for simplicity

  HTTPClient http;
  String url = "https://hijdrgyysmurhahdavtu.supabase.co/rest/v1/sensor_history";
  
  if (http.begin(client, url)) {
    // Set Headers
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", "sb_publishable_H9IcbMhIp-_GZzK7U3GyLg_vsN74Uhx");
    http.addHeader("Authorization", "Bearer sb_publishable_H9IcbMhIp-_GZzK7U3GyLg_vsN74Uhx");
    http.addHeader("Prefer", "return=minimal");

    // Read Sensors
    int mq4_value = analogRead(MQ4_PIN);
    int mq135_value = analogRead(MQ135_PIN);
    float humidity = dht.readHumidity();
    if (isnan(humidity)) {
      humidity = 0.0;
    }

    // Build JSON Payload
    String jsonPayload = "{\"device_id\":\"" + deviceId + "\","
                         "\"user_id\":\"" + userId + "\","
                         "\"gas\":" + String(mq4_value) + ","
                         "\"temperature\":" + String(mq135_value) + ","
                         "\"humidity\":" + String(humidity, 1) + "}";

    Serial.println("WiFi sending payload: " + jsonPayload);

    int httpCode = http.POST(jsonPayload);

    if (httpCode > 0) {
      Serial.printf("WiFi POST successful, response code: %d\n", httpCode);
    } else {
      Serial.printf("WiFi POST failed, error: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  } else {
    Serial.println("Unable to connect to Supabase REST endpoint.");
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("Starting BLE Setup...");

  // Initialize Sensors
  dht.begin();
  pinMode(MQ4_PIN, INPUT);
  pinMode(MQ135_PIN, INPUT);

  // Set WiFi Auto-Reconnect for stability
  WiFi.setAutoReconnect(true);

  // Load saved credentials
  preferences.begin("wifi", true);
  wifiSSID = preferences.getString("ssid", "");
  wifiPassword = preferences.getString("password", "");
  userId = preferences.getString("userId", "");
  deviceId = preferences.getString("deviceId", "");
  preferences.end();

  // Auto-connect to saved WiFi
  if (wifiSSID.length() > 0) {
    connectToWiFi();
  }

  // 1. Initialize BLE Device
  BLEDevice::init("ESP32_GATT_Server");

  // 2. Create BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // 3. Create BLE Service
  BLEService *pService = pServer->createService(BLEUUID(SERVICE_UUID), 30);

  // 4. Create Sensor Data Characteristic (Read & Notify)
  pCharacteristic = pService->createCharacteristic(
      CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pCharacteristic->addDescriptor(new BLE2902());

  // 5. Create WiFi Config Characteristic (Write)
  pWifiCharacteristic = pService->createCharacteristic(
      WIFI_CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_WRITE);
  pWifiCharacteristic->setCallbacks(new WifiCallbacks());

  // 6. Create WiFi Status Characteristic (Read & Notify)
  pWifiStatusCharacteristic = pService->createCharacteristic(
      WIFI_STATUS_CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pWifiStatusCharacteristic->addDescriptor(new BLE2902());

  // 7. Start service
  pService->start();

  // 8. Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);
  BLEDevice::startAdvertising();

  Serial.println("BLE Server is running and advertising!");
}

void loop() {
  // Handle WiFi connection request
  if (shouldConnectWifi) {
    connectToWiFi();
  }

  // Periodically send data via WiFi if connected and configured
  unsigned long currentMillis = millis();
  if (WiFi.status() == WL_CONNECTED && (currentMillis - lastWifiReportTime >= wifiReportInterval)) {
    lastWifiReportTime = currentMillis;
    sendDataToSupabase();
  }

  if (deviceConnected) {
    // Read data from real sensors
    int mq4_value = analogRead(MQ4_PIN);
    int mq135_value = analogRead(MQ135_PIN);
    float humidity = dht.readHumidity();

    // Check if DHT read failed
    if (isnan(humidity)) {
      Serial.println("Failed to read from DHT sensor!");
      humidity = 0.0;
    }

    // Format CSV: mq4,mq135,humidity
    String sensorData = String(mq4_value) + "," + String(mq135_value) + "," + String(humidity, 1);

    // Send data to the BLE client
    pCharacteristic->setValue(sensorData.c_str());
    pCharacteristic->notify();

    Serial.print("BLE sent: ");
    Serial.println(sensorData);

    delay(2000); // Send data every 2 seconds
  }

  // Handle disconnection (restart advertising)
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("Client disconnected. Restarting advertising...");
    oldDeviceConnected = deviceConnected;
  }

  // Handle new connection
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
    Serial.println("Device connected! Starting data transmission...");
    updateWifiStatus(); // Send current WiFi status on connect
  }
}