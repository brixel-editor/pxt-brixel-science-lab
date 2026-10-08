//% color=#247BA0 weight=90 block="Bowerbird data"
//% groups='["Send","Bluetooth"]'
namespace scienceData {
    let bleStarted = false
    let bleConnected = false
    let usbStarted = false
    let sending = false

    /** Start micro:bit Nordic UART. Select micro:bit in Bowerbird Web BLE; wait for connection before sending. */
    //% blockId=science_ble_start block="start Bluetooth connection" group="Bluetooth"
    export function startBluetooth(): void {
        if (bleStarted) return
        bleStarted = true
        bluetooth.onBluetoothConnected(function () { bleConnected = true })
        bluetooth.onBluetoothDisconnected(function () { bleConnected = false })
        bluetooth.startUartService()
    }

    /** True once the web app has connected to the board. */
    //% blockId=science_ble_connected block="Bluetooth connected" group="Bluetooth"
    export function bluetoothConnected(): boolean { return bleConnected }

    /** Empty rows and NaN/Infinity are rejected; no fabricated measurements are sent. */
    export function encode(values: number[]): string {
        if (!values || values.length == 0) return ""
        let line = ""
        for (let i = 0; i < values.length; i++) {
            if (!scienceInternal.finite(values[i])) return ""
            if (i > 0) line += ","
            line += "" + values[i]
        }
        return line
    }

    /** Send one sample as comma-separated numbers. Set Bowerbird to comma and 115200 baud. Empty or invalid samples are skipped. */
    //% blockId=science_send_usb block="send values $values to Bowerbird by USB" group="Send"
    //% advanced=true
    export function sendUSB(values: number[]): void { trySendUSB(values) }

    /** Put one sensor reading in this block. Bowerbird USB settings: 115200 baud, comma delimiter. */
    //% blockId=science_send_one_usb block="send measurement $value to Bowerbird by USB" group="Send"
    export function sendValueUSB(value: number): void { trySendUSB([value]) }

    export function trySendUSB(values: number[]): boolean {
        let line = encode(values)
        if (line.length == 0 || sending) return false
        sending = true
        if (!usbStarted) {
            serial.redirectToUSB()
            serial.setBaudRate(BaudRate.BaudRate115200)
            usbStarted = true
        }
        serial.writeString(line + "\n")
        sending = false
        return true
    }

    /** Start Bluetooth once at program start. A disconnected sample is dropped. No headers or units are sent. */
    //% blockId=science_send_ble block="send values $values to Bowerbird by Bluetooth" group="Send"
    //% advanced=true
    export function sendBluetooth(values: number[]): void { trySendBluetooth(values) }

    /** Start Bluetooth at program start and connect Bowerbird in micro:bit mode. Put a single sensor reading in this block. */
    //% blockId=science_send_one_ble block="send measurement $value to Bowerbird by Bluetooth" group="Send"
    export function sendValueBluetooth(value: number): void { trySendBluetooth([value]) }

    export function trySendBluetooth(values: number[]): boolean {
        let line = encode(values)
        if (line.length == 0 || !bleConnected || sending) return false
        sending = true
        bluetooth.uartWriteString(line + "\n")
        sending = false
        return true
    }
}
