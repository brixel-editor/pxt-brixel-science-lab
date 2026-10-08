enum ScienceOLEDType {
    //% block="SSD1306 (128x64)"
    SSD1306 = 0,
    //% block="SH1106 (128x64)"
    SH1106 = 1
}
enum SciencePixelColor {
    //% block="red"
    Red = 0xFF0000,
    //% block="yellow"
    Yellow = 0xFFFF00,
    //% block="green"
    Green = 0x00FF00,
    //% block="blue"
    Blue = 0x0000FF,
    //% block="purple"
    Purple = 0x800080,
    //% block="white"
    White = 0xFFFFFF,
    //% block="off"
    Off = 0
}
//% color=#B58C19 weight=60 block="Displays"
//% groups='["LCD(LCD1602)","OLED(SSD1306/SH1106)","NeoPixel(WS2812)"]'
namespace scienceDisplay {
    let lcdAddress = 0
    let oledAddress = 0
    let oledType = ScienceOLEDType.SSD1306
    let pixelBusy = false
    let displayOK = false
    function lcdReady(): boolean {
        if (lcdAddress != 0 && scienceBus.read(lcdAddress, 1)) return true
        lcdAddress = 0
        let addresses = [0x20, 0x27, 0x3F]
        for (let i = 0; i < addresses.length; i++) {
            if (scienceBus.read(addresses[i], 1)) {
                lcdAddress = addresses[i]
                scienceLCDDriver.lcdInit(lcdAddress, scienceLCDDriver.LCDType.LCD1602)
                return true
            }
        }
        return false
    }
    /** dis-001: connect LCD1602 to the shield's suitable I2C supply port. Address 0x20/0x27/0x3F is found automatically. English/numbers, 16 characters per line. */
    //% blockId=science_lcd_line block="LCD line $line text $text" group="LCD(LCD1602)"
    //% line.min=1 line.max=2 line.defl=1 text.shadow=text text.defl="Hello"
    export function lcdLine(line: number, text: any): void {
        displayOK = false
        if (line != 1 && line != 2) return
        let shown = scienceInternal.displayText(text)
        scienceBus.acquire()
        if (lcdReady()) {
            shown = shown.substr(0, 16)
            while (shown.length < 16) shown += " "
            scienceLCDDriver.lcdShowString(shown, 0, line - 1)
            displayOK = true
        }
        scienceBus.release()
    }
    /** Erase both lines of the automatically detected I2C LCD1602. */
    //% blockId=science_lcd_clear block="clear LCD" group="LCD(LCD1602)"
    export function lcdClear(): void {
        scienceBus.acquire()
        displayOK = lcdReady()
        if (displayOK) scienceLCDDriver.lcdClear()
        scienceBus.release()
    }
    function oledReady(): boolean {
        if (oledAddress != 0 && scienceBus.write(oledAddress, [0x00, 0xE3])) return true
        oledAddress = 0
        for (let address = 0x3C; address <= 0x3D; address++) {
            if (scienceBus.write(address, [0x00, 0xAE])) {
                oledAddress = address
                if (oledType == ScienceOLEDType.SH1106) scienceOLEDDriver.oledInitSH1106(address)
                else scienceOLEDDriver.oledInitSSD1306(address, scienceOLEDDriver.SSD1306Size.Size128x64_096)
                return true
            }
        }
        return false
    }
    /** Default SSD1306 matches both OLED sizes in the order list. Select SH1106 only when the module controller is confirmed; size alone does not identify the chip. */
    //% blockId=science_oled_type block="OLED type $model" group="OLED(SSD1306/SH1106)"
    export function setOLED(model: ScienceOLEDType): void {
        scienceBus.acquire()
        oledType = model
        oledAddress = 0
        scienceBus.release()
    }
    /** dis-011/012: 128x64 I2C OLED. Line 1..8, up to 21 English letters/numbers. Initializes automatically. */
    //% blockId=science_oled_line block="OLED line $line text $text" group="OLED(SSD1306/SH1106)"
    //% line.min=1 line.max=8 line.defl=1 text.shadow=text text.defl="Hello"
    export function oledLine(line: number, text: any): void {
        displayOK = false
        if (line < 1 || line > 8 || line != Math.floor(line)) return
        let shown = scienceInternal.displayText(text)
        scienceBus.acquire()
        if (oledReady()) {
            // Replace one entire page, so writing a shorter value clears the previous digits.
            scienceOLEDDriver.clearTextLine(line - 1)
            scienceOLEDDriver.oledShowString(0, (line - 1) * 8, shown.substr(0, 21), scienceOLEDDriver.OLEDColor.White)
            displayOK = true
        }
        scienceBus.release()
    }
    /** Erase all eight OLED lines. */
    //% blockId=science_oled_clear block="clear OLED" group="OLED(SSD1306/SH1106)"
    export function oledClear(): void {
        scienceBus.acquire()
        displayOK = oledReady()
        if (displayOK) scienceOLEDDriver.oledClear()
        scienceBus.release()
    }
    /** dis-013/014 WS2812 RGB: pick the color and brightness 0..255. Many LEDs at high brightness need more current than the shield 5V may supply; start low. V2 hardware DMA; BLE coexistence still needs physical testing. */
    //% blockId=science_pixels_rgb block="NeoPixel pin $pin count $count color $color brightness $brightness" group="NeoPixel(WS2812)"
    //% pin.defl=ScienceDigitalPin.P9 count.min=1 count.max=64 count.defl=8
    //% color.shadow="colorNumberPicker" color.defl=0xff0000
    //% brightness.min=0 brightness.max=255 brightness.defl=32
    export function pixelsColor(pin: ScienceDigitalPin, count: number, color: number, brightness: number): void {
        showColor(pin, count, color, brightness)
    }
    /** Older fixed-color block kept so saved projects still open; brightness 32/255. */
    //% blockId=science_pixels block="NeoPixel pin $pin count $count color $color" group="NeoPixel(WS2812)"
    //% pin.defl=ScienceDigitalPin.P9 count.min=1 count.max=64 count.defl=8 deprecated=true
    export function pixels(pin: ScienceDigitalPin, count: number, color: SciencePixelColor): void {
        showColor(pin, count, color, 32)
    }
    function showColor(pin: ScienceDigitalPin, count: number, color: number, brightness: number): void {
        displayOK = false
        if (!scienceInternal.validDigital(pin) || !scienceInternal.finite(count) || count < 1 || count > 64) return
        if (!scienceInternal.finite(color) || !scienceInternal.finite(brightness)) return
        brightness = Math.max(0, Math.min(255, Math.round(brightness)))
        while (pixelBusy) basic.pause(1)
        pixelBusy = true
        scienceInternal.prepare(pin)
        count = Math.floor(count)
        let data = pins.createBuffer(count * 3)
        let red = (color >> 16) & 255
        let green = (color >> 8) & 255
        let blue = color & 255
        for (let i = 0; i < count; i++) {
            data[i * 3] = Math.idiv(green * brightness, 255)
            data[i * 3 + 1] = Math.idiv(red * brightness, 255)
            data[i * 3 + 2] = Math.idiv(blue * brightness, 255)
        }
        displayOK = scienceNative.showPixels(pin, data)
        // CODAL WS2812B::play blocks until its DMA stream consumes the frame. Yield between frames.
        basic.pause(5)
        pixelBusy = false
    }
    // Internal diagnostic for text programs, no extra student-facing status block.
    export function lastDisplayAvailable(): boolean { return displayOK }
}
