---
title: 开发微信小程序为 esp32-c3 板子蓝牙配网实践
createTime: 2025/10/26 16:58:04
permalink: /blog/2xnpkxsp/
tags:
    - 硬件
    - Arduino 开发
    - 微信小程序
---

> [!NOTE]
>
> 本文记录开发微信小程序为 esp32-c3 板子蓝牙配网的实践（少讲理论，多讲实现）
>
> 需要前置知识 [为 esp32-c3 板子配置 WiFi 和低功耗蓝牙(BLE)](./esp32-c3-wifi-and-ble.md)

## 注册微信小程序

首先需要在微信公众平台上注册小程序、下载小程序开发平台并绑定appID

此部分在网络上有许多教程，不再赘述

---

首先想想我们要实现什么？

::: steps

1. 小程序中实现手机连接板子 BLE

2. 手机向板子写入 WiFi 的 SSID 和密码（需要 write 特征）

3. 板子尝试连接并将结果返回手机 (需要 notify 特征)

:::

## 后端开发（Arduino）

同样的，导入 WiFi 和 BLE 所需库并配置参数

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

BLE 通信通过 ==服务(Service)和特征(Characteristic)实现==

| 特征            | UUID          | 功能            |
| ------------- | ------------- | ------------- |
| SSID_UUID   | 6E400002... | 接收 Wi-Fi 名称   |
| PASS_UUID   | 6E400003... | 接收 Wi-Fi 密码   |
| STATUS_UUID | 6E400004... | 通知 Wi-Fi 连接状态 |

SERVICE_UUID 用来把这些特征归为同一个服务，客户端扫描时可以一起识别。

### 回调类

接下来定义一个回调类 `WiFiConfigCallback`

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

每当客户端往某个特征（SSID 或密码）写入数据时，ESP32 就会自动执行 `onWrite()`

::: collapse 

-   为什么会自动执行 `onWrite()` ?（原理解释，可以不看）

    在使用 ESP32 的 BLE 库时，ESP32 BLE 栈内部维护了一套事件监听系统（event dispatcher）。

    一会在初始化函数中，我们将会使用 `ssidChar->setCallbacks(new WiFiConfigCallback());`

    这将告诉 ESP32：“当这个特征（ssidChar）被客户端写入时，请调用我这个类（WiFiConfigCallback）中的 `onWrite()` 函数。”

    相当于在 BLE 栈中注册了一个“事件监听器”。

    我们可以将此过程理解为一个事件链

    ```yaml
    手机 App（客户端） → 向特征 UUID 写入数据 → ESP32（服务端） BLE 栈接收数据 
    → 触发“write event” → 调用注册的回调对象的 onWrite() 方法

    ```

:::


### `onWrite()` 方法

```cpp
String uuid = pCharacteristic->getUUID().toString(); //读取写入特征的 UUID
String raw = pCharacteristic->getValue();
String value = String(raw.c_str()); // 获取写入的值（原始字节 → 字符串）

Serial.print("Write event from UUID: ");
Serial.println(uuid);
Serial.print("Value: ");
Serial.println(value);

//判断是哪个特征(SSID or PASSWORD)
if (uuid.equalsIgnoreCase(SSID_UUID)) {
    ssid = value;
    Serial.println("→ SSID received.");
} else if (uuid.equalsIgnoreCase(PASS_UUID)) {
    password = value;
    Serial.println("→ Password received.");
    connectToWiFi();
}
```

### `connectToWiFi()` 方法

```cpp
Serial.println("Resetting WiFi config...");
WiFi.disconnect(true, true); // 重置 WiFi 连接
delay(200);
WiFi.mode(WIFI_STA); // 设置为「STA 模式」（客户端模式）
delay(100);
WiFi.begin(ssid.c_str(), password.c_str()); // 尝试连接
Serial.printf("Connecting to WiFi SSID: %s\n", ssid.c_str());

int tries = 0;
while (WiFi.status() != WL_CONNECTED && tries++ < 20) {
    delay(500);
    Serial.print(".");
    Serial.print("WiFi.status()=");
    Serial.println(WiFi.status());
} // 尝试连接（不能像上一节那样无限尝试了，我们要及时给予能否连接的反馈）
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
statusChar->notify(); // 调用 notify() 通知客户端连接状态（需要 notify 特征）
```

### `setup()` 初始化 BLE 与服务

已在 [前置知识](./esp32-c3-wifi-and-ble.md) 中讲过的不在赘述（仅高亮部分有所区别）

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

  ssidChar->setCallbacks(new WiFiConfigCallback()); // [!code highlight] 设置回调类
  passChar->setCallbacks(new WiFiConfigCallback()); // [!code highlight]
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  BLEDevice::startAdvertising();

  Serial.println("BLE Config Service started!");
}
```

## 前端开发（微信小程序）

由于页面设计并非本节重点，你可以自己设计或使用 LLM 为你随便写一份（主要实现功能）

故我们只讲 ts 函数实现 ==（全部代码过长，我将会在文末附上下载链接供参考，文中仅会讲实现重点）==

小程序主要完成以下任务：

```yaml
打开蓝牙 → 扫描设备 → 连接 ESP32 → 获取特征值 
→ 发送 Wi-Fi 名称与密码 → 等待设备反馈连接状态
```

### 定义 UUID 常量

```ts
const SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E'
const SSID_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'
const PASS_UUID = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'
const STATUS_UUID = '6E400004-B5A3-F393-E0A9-E50E24DCCA9E'
```

这些 UUID 必须与 ESP32 固件中的定义 ==完全一致==，否则小程序无法识别到正确的服务和特征。

| 名称             | 用途             |
| -------------- | -------------- |
| SERVICE_UUID | 蓝牙服务标识         |
| SSID_UUID    | 写入 Wi-Fi 名称    |
| PASS_UUID    | 写入 Wi-Fi 密码    |
| STATUS_UUID  | 接收连接结果（NOTIFY） |

### 字符串、二进制转换

微信小程序的 BLE 接口 ==只支持二进制数据（ArrayBuffer）==

所以必须把字符串手动编码 / 解码

```ts
const stringToArrayBuffer = (text: string) => { ... }
const arrayBufferToString = (buffer: ArrayBufferLike) => { ... }
```

这两个函数实现了 UTF-8 编解码，确保中文 / 特殊字符不会乱码

后续写入 Wi-Fi 信息时都要先调用 `stringToArrayBuffer()`

### 蓝牙初始化与状态检测

微信内置了实现函数，我们只需调用

```ts
wx.openBluetoothAdapter()
wx.getBluetoothAdapterState()
```

对应我代码中的函数（方便检索）

```ts
initBluetooth()
checkBluetooth()
```

### 扫描与发现设备

同样，微信内置了实现函数

```ts
wx.startBluetoothDevicesDiscovery()
wx.onBluetoothDeviceFound(...)
```

调用扫描接口后，小程序会不断触发设备发现回调

将发现的设备保存到 devices 数组，用于展示在界面上

对应函数：

```ts
toggleDiscovery()
handleDeviceFound()
```

### 连接设备与获取服务

当用户点击设备时

```ts
wx.createBLEConnection()
```

连接成功后

```ts
wx.getBLEDeviceServices()
wx.getBLEDeviceCharacteristics()
```

对应函数

```ts
connectDevice() → prepareServices() → getCharacteristics()
```

==作用：==

1. 连接 ESP32；

2. 找到匹配的 SERVICE_UUID；

3. 获取三个特征（SSID / PASS / STATUS）。

获取成功后，保存在：

```ts
ssidCharacteristic
passCharacteristic
statusCharacteristic
```

### 启用通知（接收设备反馈）

```ts
wx.notifyBLECharacteristicValueChange({ state: true })
```

开启后，设备通过 STATUS_UUID 主动推送 Wi-Fi 连接结果。
配合事件监听：

```ts
wx.onBLECharacteristicValueChange(...)
```

当 ESP32 调用：

```cpp
statusChar->setValue("CONNECTED");
statusChar->notify();
```

小程序就能收到 "CONNECTED" 或 "FAILED" 字符串（不要忘记调用 `arrayBufferToString()` 方法）

### 发送 WiFi SSID 和密码

核心函数

```ts
sendWifiCredentials()
```

==执行逻辑：==

1. 调用 writeValue() 写入 SSID；

2. 写入密码；

3. 等待设备返回状态。

```ts
wx.writeBLECharacteristicValue({
  deviceId,
  serviceId,
  characteristicId,
  value: stringToArrayBuffer(ssid)
})
```

这与 ESP32 端的 `onWrite()` 一一对应

当密码写入完成后，ESP32 自动执行 WiFi 连接并通过 NOTIFY 反馈结果

> [!NOTE]
>
> 以上为基本实现流程，剩下代码中的事件监听与断线处理、日志等可有可无，不影响主体功能，自行研究


## 整体流程

| 阶段      | 小程序端操作                                 | ESP32 端响应                     |
| ------- | -------------------------------------- | ----------------------------- |
| 打开蓝牙    | `openBluetoothAdapter()`               | —                             |
| 扫描设备    | `startBluetoothDevicesDiscovery()`     | 广播中                           |
| 连接设备    | `createBLEConnection()`                | 建立 BLE 会话                    |
| 获取服务    | `getBLEDeviceServices()`               | —                             |
| 获取特征    | `getBLEDeviceCharacteristics()`        | —                             |
| 写入 SSID | `writeBLECharacteristicValue()`        | `onWrite(SSID_UUID)`            |
| 写入密码    | `writeBLECharacteristicValue()`        | `onWrite(PASS_UUID)` → Wi-Fi 连接 |
| 启用通知    | `notifyBLECharacteristicValueChange()` | statusChar->`notify()`         |
| 接收结果    | `onBLECharacteristicValueChange()`     | 推送 “CONNECTED” / “FAILED”     |

## 附件

[ts 源代码](https://api.honahec.cc/download/119cc84c-4bbb-444a-a1b8-1a5a84460d5a)