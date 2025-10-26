---
title: 为 esp32-c3 板子配置 WiFi 和低功耗蓝牙(BLE)实践
createTime: 2025/10/26 15:58:41
tags:
  - 硬件
  - Arduino 开发
permalink: /blog/lqnikpfi/
---

> [!INFO]
>
> Arduino IDE（Integrated Development Environment）是 Arduino 官方推出的 图形化编程环境，用于 ==编写、编译、上传代码== 到 Arduino 系列或兼容开发板（如 ESP32-C3、ESP8266、STM32 等）。
>
> ESP32-C3 是由 乐鑫（Espressif Systems） 推出的 ==低功耗 Wi-Fi + 蓝牙 SoC== ，是 ESP32 家族的一员，使用 RISC-V 32 位单核 CPU。

> [!NOTE]
>
> 本文记录使用 Arduino IDE 为 Geekble Mini ESP32-c3 配置 WiFi 和低功耗蓝牙(BLE)

---

## 配置 WiFi

ESP32 可使用 WiFi 控制库 `WiFi.h`

该库提供了连接 Wi-Fi、查询 IP、断开连接等常用函数。

首先 ==引入库并设置 WiFi 参数==：

```c
#include <WiFi.h>

// your basic parameters here.

// ------------------ 连接WiFi ------------------
const char* ssid = "test";
const char* password = "12356789";
```

在初始化函数中为设备连接 WiFi

```c
void setup() {
    // WiFi
    Serial.begin(9600); //开启监听串口，输出日志以方便调试
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
> 常见的 WiFi 状态码：
>
> ==0 (WL_IDLE_STATUS)==：当调用 WiFi.begin() 后进入空闲状态。 
>
> ==1 (WL_NO_SSID_AVAIL)==：表示 没有可用的 SSID（即找不到你要连接的网络） 
> 
> ==3 (WL_CONNECTED)==：表示已连接成功。 
>
> ==6 (WL_DISCONNECTED)==：表示已断开连接或从网络中脱离。 

> [!WARNING]
>
> 仅在 iPhone 热点上完成测试（校网需要认证，回头测）：
>
> 将热点名称设置尽可能简单，无法识别特殊字符
>
> 开启 ==最大兼容性模式=={.important} （即改为 2.4ghz 频段），板子无法连接 5ghz 频段。

## 配置蓝牙

> [!INFO]
>
> ESP32-c3 使用低功耗蓝牙(BLE)，手机蓝牙无法自动识别，测试建议下载 app "==nRF Connect=="

同样 ESP32 提供了 Bluetooth Low Energy (BLE) 支持库，分别为

| 库名 | 功能 |
| --- | --- |
| BLEDevice.h | 管理 BLE 设备初始化、广播等全局功能 |
| BLEUtils.h | 提供字符串、UUID、调试等工具函数 |
| BLEServer.h | 用于创建服务端（Server）、服务（Service）、特征（Characteristic）等对象 |

首先仍然是引入库并设置 BLE 参数

```c
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>

// your basic parameters here.

// ------------------ 连接BLE ------------------

BLEServer* pServer = nullptr; // 蓝牙服务端
BLECharacteristic* pCharacteristic = nullptr; // 代表一个蓝牙特征（类似“变量”，用于与客户端交换数据）

// BLE 协议中用于区分不同服务和特征的字符串
#define SERVICE_UUID        "12345678-1234-1234-1234-1234567890ab" 
#define CHARACTERISTIC_UUID "abcd1234-5678-90ab-cdef-1234567890ab"
```

在初始化函数中启用蓝牙服务器

> [!INFO]
>
> 在 BLE 的结构层级中：
>
> ==设备(Device) → 包含多个服务(Service) → 每个服务下有多个特征(Characteristic)==

```c
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
                        BLECharacteristic::PROPERTY_NOTIFY   // 服务器可以接收服务端的通知
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

之后，你可以在类似 nRF Connect 等适配 BLE 的软件上搜索到设备并连接

---

当然，我们不希望为板子写死一个 WiFi，而希望通过蓝牙为板子配网

我将很快更新如何开发一个微信小程序实现蓝牙配网（这是最简单的适配安卓和 iOS 双平台的开发流程）