---
title: Configuring WiFi and Bluetooth Low Energy (BLE) for ESP32-C3 Board
createTime: 2025/10/26 15:58:41
tags:
  - Hardware
  - Arduino Development
permalink: /en/blog/lqnikpfi/
---

> [!INFO]
>
> Arduino IDE is the official graphical programming environment from Arduino, used for writing, compiling, and uploading code to Arduino series or compatible development boards (such as ESP32-C3, ESP8266, STM32, etc.).
>
> ESP32-C3 is a low-power Wi-Fi + Bluetooth SoC launched by Espressif Systems, a member of the ESP32 family, using a RISC-V 32-bit single-core CPU.

> [!NOTE]
>
> This article documents using Arduino IDE to configure WiFi and Bluetooth Low Energy (BLE) for Geekble Mini ESP32-C3

---

## Configuring WiFi

ESP32 can use the WiFi control library `WiFi.h`

This library provides common functions for connecting to Wi-Fi, querying IP, disconnecting, etc.

First, import the library and set WiFi parameters:

```cpp
#include <WiFi.h>

// your basic parameters here.

// ------------------ 连接WiFi ------------------
const char* ssid = "test";
const char* password = "12356789";
```

Connect the device to WiFi in the initialization function

```cpp
void setup() {
    // WiFi
    Serial.begin(9600); //开启监听串口,输出日志以方便调试
    WiFi.begin(ssid, password); //调用 WiFi.begin() 方法开始连接 WiFi（此过程异步）

    Serial.print("Connecting to ");
    Serial.println(ssid);

    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
        Serial.print("Status: ");
        Serial.println(WiFi.status());
    } //持续连接，直到连接成功

    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP()); //输出内网 IP
}
```

> [!INFO]
>
> Common WiFi status codes:
>
> 0 (WL_IDLE_STATUS): Enters idle state after calling WiFi.begin().
>
> 1 (WL_NO_SSID_AVAIL): Indicates no SSID available (i.e., cannot find the network you want to connect to)
>
> 3 (WL_CONNECTED): Indicates successful connection.
>
> 6 (WL_DISCONNECTED): Indicates disconnected or detached from the network.

> [!WARNING]
>
> Only tested on iPhone hotspot (campus network requires authentication, will test later):
>
> Set the hotspot name as simple as possible, special characters cannot be recognized
>
> Enable maximum compatibility mode (i.e., switch to 2.4GHz band), the board cannot connect to 5GHz band.

## Configuring Bluetooth

> [!INFO]
>
> ESP32-C3 uses Bluetooth Low Energy (BLE), which cannot be automatically recognized by phone Bluetooth. For testing, it's recommended to download the app "nRF Connect"

ESP32 also provides Bluetooth Low Energy (BLE) support libraries:

| Library     | Function                                                                   |
| ----------- | -------------------------------------------------------------------------- |
| BLEDevice.h | Manages BLE device initialization, advertising, and other global functions |
| BLEUtils.h  | Provides utility functions for strings, UUIDs, debugging, etc.             |
| BLEServer.h | Used to create server, service, characteristic, and other objects          |

First, import the libraries and set BLE parameters

```cpp
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>

// your basic parameters here.

// ------------------ 连接BLE ------------------

BLEServer* pServer = nullptr; // 蓝牙服务端
BLECharacteristic* pCharacteristic = nullptr; // 代表一个蓝牙特征（类似"变量"，用于与客户端交换数据）

// BLE 协议中用于区分不同服务和特征的字符串
#define SERVICE_UUID        "12345678-1234-1234-1234-1234567890ab"
#define CHARACTERISTIC_UUID "abcd1234-5678-90ab-cdef-1234567890ab"
```

Enable the Bluetooth server in the initialization function

> [!INFO]
>
> In the BLE structure hierarchy:
>
> Device → Contains multiple Services → Each service has multiple Characteristics

```cpp
void setup() {
    // 初始化 BLE
    BLEDevice::init("ESP32C3_BLE"); //初始化蓝牙模块，并为设备设置名称 "ESP32C3_BLE"
    pServer = BLEDevice::createServer();
    BLEService *pService = pServer->createService(SERVICE_UUID);

    // 创建可读可写特征
    pCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID,
                        BLECharacteristic::PROPERTY_READ   | // 客户端可以读取数据
                        BLECharacteristic::PROPERTY_WRITE  | // 客户端可以写入数据
                        BLECharacteristic::PROPERTY_NOTIFY   // 客户端可以接收服务端的通知
                        );

    pCharacteristic->setValue("Hello from ESP32C3!"); // 类似 "Hello World!"
    pService->start(); // 启动服务

    // 启动广播
    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising(); // 获取广播对象
    pAdvertising->addServiceUUID(SERVICE_UUID); // 将你的服务加入广播包中
    BLEDevice::startAdvertising(); // 开始广播

    Serial.println("BLE device ready, waiting for connection...");
}
```

After this, you can search for and connect to the device on BLE-compatible software like nRF Connect

---

Of course, we don't want to hardcode a WiFi for the board, but rather configure the network through Bluetooth

I will soon update on how to develop a WeChat mini-program to implement Bluetooth network configuration (this is the simplest development process compatible with both Android and iOS platforms)

update: Updated [Developing WeChat Mini-Program for ESP32-C3 Board Bluetooth Network Configuration](./configure-wifi-for-esp32-c3-with-applet.md)
