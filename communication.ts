//% color=#247BA0 weight=90 block="Bowerbird data"
//% groups='["Send"]'
// Wired (USB) only. Bluetooth sending is the companion extension brixel-science-lab-ble,
// so classes that only use USB never start the BLE stack (its interrupts disturb timing-critical sensors).
namespace scienceData {
    let usbStarted = false
    let sending = false

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
}
