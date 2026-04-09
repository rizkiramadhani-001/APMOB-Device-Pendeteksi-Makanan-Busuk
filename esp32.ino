#include <BLE2902.h> // Library penting untuk fitur Notifikasi!
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>


#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLEServer *pServer = NULL;
BLECharacteristic *pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Callback untuk mengatur status koneksi
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) { deviceConnected = true; };

  void onDisconnect(BLEServer *pServer) { deviceConnected = false; }
};

void setup() {
  Serial.begin(115200);
  Serial.println("Starting BLE Setup...");

  // 1. Inisialisasi perangkat BLE
  BLEDevice::init("ESP32_GATT_Server");

  // 2. Buat BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // 3. Buat BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // 4. Buat BLE Characteristic (Read & Notify agar data mengalir otomatis ke
  // website)
  pCharacteristic = pService->createCharacteristic(
      CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);

  // 5. Tambahkan descriptor yang dibutuhkan untuk fitur Notify (subscribe)
  pCharacteristic->addDescriptor(new BLE2902());

  // 6. Mulai service
  pService->start();

  // 7. Mulai advertising agar bisa dipindai website
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);
  BLEDevice::startAdvertising();

  Serial.println("BLE Server is running and advertising!");
}

void loop() {
  // Jika tersambung dengan website, kirimkan data dummy secara periodik
  if (deviceConnected) {
    // Generate data dummy
    int gas = random(300, 800);    // PPM (misal: 300 - 800)
    int humidity = random(40, 80); // Kelembaban (misal: 40 - 80 %)
    float temperature = random(200, 350) / 10.0; // Suhu (misal: 20.0 - 35.0 C)

    // Format CSV: gas,humidity,temperature (Sesuai dengan website)
    String dummyData =
        String(gas) + "," + String(humidity) + "," + String(temperature, 1);

    // Kirim data ke klien (website)
    pCharacteristic->setValue(dummyData.c_str());
    pCharacteristic->notify();

    Serial.print("Data sent: ");
    Serial.println(dummyData);

    delay(2000); // Kirim data setiap 2 detik (2000 ms)
  }

  // Jika koneksi terputus, mulai kembali advertising agar bisa tersambung ulang
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("Client disconnected. Restarting advertising...");
    oldDeviceConnected = deviceConnected;
  }

  // Menangkap momen saat website baru saja tersambung
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
    Serial.println("Device connected! Starting data transmission...");
  }
}