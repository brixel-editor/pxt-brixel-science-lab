#include "pxt.h"
#if MICROBIT_CODAL
#include "neopixel.h"
#include "NRF52Serial.h"
#if !CONFIG_ENABLED(HARDWARE_NEOPIXEL)
#error "BRIXEL Science Lab requires HARDWARE_NEOPIXEL=1 for the V2 DMA output path"
#endif
#endif
using namespace pxt;

namespace scienceNative {
#if MICROBIT_CODAL
static codal::NRF52Serial *sensorSerial = NULL;
#endif
// V2's second UART is independent of the USB console on UARTE0.
//%
bool startSensorUART(int rx, int tx) {
#if MICROBIT_CODAL
    auto rxPin = pxt::getPin(rx);
    auto txPin = pxt::getPin(tx);
    if (!rxPin || !txPin || rx == tx) return false;
    if (!sensorSerial) sensorSerial = new codal::NRF52Serial(*txPin, *rxPin, NRF_UARTE1);
    else if (sensorSerial->redirect(*txPin, *rxPin) != DEVICE_OK) return false;
    if (sensorSerial->setRxBufferSize(254) != DEVICE_OK || sensorSerial->setBaudrate(9600) != DEVICE_OK) return false;
    // Initialize the lazy receive buffer and discard old data.
    uint8_t discard[64];
    for (int i = 0; i < 4; i++) if (sensorSerial->read(discard, 64, codal::ASYNC) < 64) break;
    return true;
#else
    return false;
#endif
}
//%
Buffer readSensorUART() {
#if MICROBIT_CODAL
    if (sensorSerial) {
        uint8_t data[64];
        int count = sensorSerial->read(data, 64, codal::ASYNC);
        if (count > 0) return mkBuffer(data, count);
    }
#endif
    return mkBuffer(NULL, 0);
}
//%
bool writeSensorUART(Buffer data) {
#if MICROBIT_CODAL
    if (!sensorSerial || data->length == 0 || data->length > 32) return false;
    return sensorSerial->send(data->data, data->length, codal::SYNC_SLEEP) == data->length;
#else
    return false;
#endif
}
// First byte is success status; following bytes are payload. Unlike core, retain I2C read errors.
//%
Buffer readI2C(int address, int size) {
    if (size < 1 || size > 64 || address < 8 || address > 119) return mkBuffer(NULL, 1);
    Buffer result = mkBuffer(NULL, size + 1);
#if MICROBIT_CODAL
    int status = uBit.i2c.read(address << 1, result->data + 1, size, false);
#else
    int status = uBit.i2c.read(address << 1, (char *)(result->data + 1), size, false);
#endif
    result->data[0] = status == 0 ? 1 : 0;
    return result;
}

// CODAL hardware PWM/DMA path, avoiding the core bit-banger's long interrupt masking.
//%
bool showPixels(int pin, Buffer data) {
#if MICROBIT_CODAL
#if CONFIG_ENABLED(HARDWARE_NEOPIXEL)
    auto target = pxt::getPin(pin);
    if (!target || data->length == 0 || data->length > 192) return false;
    codal::neopixel_send_buffer(*target, data->data, data->length);
    return true;
#else
    return false;
#endif
#else
    return false;
#endif
}
}
