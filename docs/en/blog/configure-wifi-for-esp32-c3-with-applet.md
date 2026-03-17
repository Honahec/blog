---
title: Developing a WeChat Mini Program for ESP32-C3 Board Bluetooth Network Configuration Practice
createTime: 2025/10/26 16:58:04
permalink: /en/blog/2xnpkxsp/
tags:
  - Hardware
  - Arduino Development
  - WeChat Mini Program
---

> [!NOTE]
>
> This article documents the practice of developing a WeChat Mini Program for ESP32-C3 board Bluetooth network configuration (less theory, more implementation)
>
> Prerequisite knowledge required: [Configuring WiFi and Bluetooth Low Energy (BLE) for ESP32-C3 Board](./esp32-c3-wifi-and-ble.md)

## Register WeChat Mini Program

First, you need to register a Mini Program on the WeChat Official Accounts Platform, download the Mini Program development platform, and bind the appID.

There are many tutorials available online for this part, so I won't elaborate further.

---

First, let's think about what we want to achieve:

::: steps

1. Implement phone connection to board BLE in the Mini Program

2. Phone writes WiFi SSID and password to the board (requires write characteristic)

3. Board attempts to connect and returns the result to the phone (requires notify characteristic)

:::

## Backend Development (Arduino)

Similarly, import the required libraries for WiFi and BLE and configure parameters:

```cpp
#include <WiFi.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>

BLECharacteristic *ssidChar;
BLECharacteristic *passChar;
BLECharacteristic *statusChar;

#define SERVICE_UUID        "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define SSID_UUID           "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define PASS_UUID           "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"
#define STATUS_UUID         "6E400004-B5A3-F393-E0A9-E50E24DCCA9E"

String ssid = "";
String password = "";
```

BLE communication is implemented through ==Services and Characteristics==

| Characteristic | UUID        | Function                       |
| -------------- | ----------- | ------------------------------ |
| SSID_UUID      | 6E400002... | Receive Wi-Fi name             |
| PASS_UUID      | 6E400003... | Receive Wi-Fi password         |
| STATUS_UUID    | 6E400004... | Notify Wi-Fi connection status |

SERVICE_UUID is used to group these characteristics into the same service, so clients can identify them together when scanning.

### Callback Class

Next, define a callback class `WiFiConfigCallback`:

```cpp
class WiFiConfigCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) override {
    ...
  }

  void connectToWiFi() {
    ...
  }
};
```

Whenever a client writes data to a characteristic (SSID or password), the ESP32 will automatically execute `onWrite()`.

::: collapse

- Why does `onWrite()` execute automatically? (Principle explanation, optional reading)

  When using the ESP32 BLE library, the ESP32 BLE stack internally maintains an event listening system (event dispatcher).

  In the initialization function later, we will use `ssidChar->setCallbacks(new WiFiConfigCallback());`

  This tells the ESP32: "When this characteristic (ssidChar) is written to by a client, please call the `onWrite()` function in my class (WiFiConfigCallback)."

  This is equivalent to registering an "event listener" in the BLE stack.

  We can understand this process as an event chain:

  ```yaml
  Phone App (Client) → Writes data to characteristic UUID → ESP32 (Server) BLE stack receives data
  → Triggers "write event" → Calls the registered callback object's onWrite() method
  ```

:::

### `onWrite()` Method

```cpp
String uuid = pCharacteristic->getUUID().toString(); //Read the UUID of the written characteristic
String raw = pCharacteristic->getValue();
String value = String(raw.c_str()); // Get the written value (raw bytes → string)

Serial.print("Write event from UUID: ");
Serial.println(uuid);
Serial.print("Value: ");
Serial.println(value);

//Determine which characteristic (SSID or PASSWORD)
if (uuid.equalsIgnoreCase(SSID_UUID)) {
    ssid = value;
    Serial.println("→ SSID received.");
} else if (uuid.equalsIgnoreCase(PASS_UUID)) {
    password = value;
    Serial.println("→ Password received.");
    connectToWiFi();
}
```

### `connectToWiFi()` Method

```cpp
Serial.println("Resetting WiFi config...");
WiFi.disconnect(true, true); // Reset WiFi connection
delay(200);
WiFi.mode(WIFI_STA); // Set to "STA mode" (client mode)
delay(100);
WiFi.begin(ssid.c_str(), password.c_str()); // Attempt to connect
Serial.printf("Connecting to WiFi SSID: %s\n", ssid.c_str());

int tries = 0;
while (WiFi.status() != WL_CONNECTED && tries++ < 20) {
    delay(500);
    Serial.print(".");
    Serial.print("WiFi.status()=");
    Serial.println(WiFi.status());
} // Attempt to connect (can't try indefinitely like in the previous section, we need to provide timely feedback on connection success)
Serial.println();

if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    statusChar->setValue("CONNECTED");
} else {
    Serial.println("WiFi Failed!");
    statusChar->setValue("FAILED");
}
statusChar->notify(); // Call notify() to notify the client of connection status (requires notify characteristic)
```

### `setup()` Initialize BLE and Service

Parts already covered in [Prerequisite Knowledge](./esp32-c3-wifi-and-ble.md) won't be repeated (only highlighted sections differ):

```cpp
void setup() {
  Serial.begin(9600);
  BLEDevice::init("ESP32C3_BLE");
  delay(500);

  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);

  ssidChar = pService->createCharacteristic(SSID_UUID, BLECharacteristic::PROPERTY_WRITE);
  passChar = pService->createCharacteristic(PASS_UUID, BLECharacteristic::PROPERTY_WRITE);
  statusChar = pService->createCharacteristic(STATUS_UUID, BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ);

  ssidChar->setCallbacks(new WiFiConfigCallback()); // [!code highlight] Set callback class
  passChar->setCallbacks(new WiFiConfigCallback()); // [!code highlight]
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  BLEDevice::startAdvertising();

  Serial.println("BLE Config Service started!");
}
```

## Frontend Development (WeChat Mini Program)

Since page design is not the focus of this section, you can design it yourself or use an LLM to write one for you (mainly implementing functionality)

Therefore, we will only discuss the TypeScript function implementation ==(the complete code is too long, I will provide a download link at the end of the article for reference, only the implementation highlights will be covered in the text)==

The mini program mainly completes the following tasks:

```yaml
Open Bluetooth → Scan devices → Connect to ESP32 → Get characteristics
→ Send Wi-Fi name and password → Wait for device feedback on connection status
```

### Define UUID Constants

```ts
const SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
const SSID_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';
const PASS_UUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';
const STATUS_UUID = '6E400004-B5A3-F393-E0A9-E50E24DCCA9E';
```

These UUIDs must be ==completely identical== to the definitions in the ESP32 firmware, otherwise the mini program cannot recognize the correct services and characteristics.

| Name         | Purpose                            |
| ------------ | ---------------------------------- |
| SERVICE_UUID | Bluetooth service identifier       |
| SSID_UUID    | Write Wi-Fi name                   |
| PASS_UUID    | Write Wi-Fi password               |
| STATUS_UUID  | Receive connection result (NOTIFY) |

### String and Binary Conversion

WeChat Mini Program's BLE interface ==only supports binary data (ArrayBuffer)==

So strings must be manually encoded/decoded

```ts
const stringToArrayBuffer = (text: string) => { ... }
const arrayBufferToString = (buffer: ArrayBufferLike) => { ... }
```

These two functions implement UTF-8 encoding/decoding, ensuring Chinese characters/special characters don't become garbled

When writing Wi-Fi information later, you must first call `stringToArrayBuffer()`

### Bluetooth Initialization and Status Detection

WeChat has built-in implementation functions, we just need to call them

```ts
wx.openBluetoothAdapter();
wx.getBluetoothAdapterState();
```

Corresponding functions in my code (for easy reference)

```ts
initBluetooth();
checkBluetooth();
```

### Scanning and Discovering Devices

Similarly, WeChat has built-in implementation functions

```ts
wx.startBluetoothDevicesDiscovery()
wx.onBluetoothDeviceFound(...)
```

After calling the scan interface, the mini program will continuously trigger device discovery callbacks

Save discovered devices to the devices array for display on the interface

Corresponding functions:

```ts
toggleDiscovery();
handleDeviceFound();
```

### Connecting to Device and Getting Services

When the user clicks on a device

```ts
wx.createBLEConnection();
```

After successful connection

```ts
wx.getBLEDeviceServices();
wx.getBLEDeviceCharacteristics();
```

Corresponding functions

```ts
connectDevice() → prepareServices() → getCharacteristics()
```

==Purpose:==

1. Connect to ESP32;

2. Find matching SERVICE_UUID;

3. Get three characteristics (SSID / PASS / STATUS).

After successful retrieval, save in:

```ts
ssidCharacteristic;
passCharacteristic;
statusCharacteristic;
```

### Enable Notifications (Receive Device Feedback)

```ts
wx.notifyBLECharacteristicValueChange({ state: true });
```

After enabling, the device actively pushes Wi-Fi connection results through STATUS_UUID.
Combined with event listening:

```ts
wx.onBLECharacteristicValueChange(...)
```

When ESP32 calls:

```cpp
statusChar->setValue("CONNECTED");
statusChar->notify();
```

The mini program can receive "CONNECTED" or "FAILED" strings (don't forget to call the `arrayBufferToString()` method)

### Send WiFi SSID and Password

Core function

```ts
sendWifiCredentials();
```

==Execution logic:==

1. Call writeValue() to write SSID;

2. Write password;

3. Wait for device to return status.

```ts
wx.writeBLECharacteristicValue({
  deviceId,
  serviceId,
  characteristicId,
  value: stringToArrayBuffer(ssid),
});
```

This corresponds one-to-one with the `onWrite()` on the ESP32 side

After the password is written, ESP32 automatically executes WiFi connection and provides feedback through NOTIFY

> [!NOTE]
>
> The above is the basic implementation flow. The remaining event listening, disconnection handling, logging, etc. in the code are optional and do not affect the main functionality. Study them on your own

## Overall Flow

| Stage               | Mini Program Operations                | ESP32 Response                          |
| ------------------- | -------------------------------------- | --------------------------------------- |
| Open Bluetooth      | `openBluetoothAdapter()`               | —                                       |
| Scan Devices        | `startBluetoothDevicesDiscovery()`     | Broadcasting                            |
| Connect Device      | `createBLEConnection()`                | Establish BLE session                   |
| Get Services        | `getBLEDeviceServices()`               | —                                       |
| Get Characteristics | `getBLEDeviceCharacteristics()`        | —                                       |
| Write SSID          | `writeBLECharacteristicValue()`        | `onWrite(SSID_UUID)`                    |
| Write Password      | `writeBLECharacteristicValue()`        | `onWrite(PASS_UUID)` → Wi-Fi connection |
| Enable Notification | `notifyBLECharacteristicValueChange()` | statusChar->`notify()`                  |
| Receive Result      | `onBLECharacteristicValueChange()`     | Push "CONNECTED" / "FAILED"             |

## Attachments

[ts source code](https://api.honahec.cc/download/119cc84c-4bbb-444a-a1b8-1a5a84460d5a)
