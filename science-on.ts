// Intelligent Science Lab ON (KOFAC). The micro:bit has no internet, so a PC program relays:
// DSL On 2 (web app, ../dsl-on-web) over USB 115200 or, with the Bluetooth extension, BLE UART.
// micro:bit -> PC, one command per line:  SON,START,<group code> | SON,SEND,<TYPE>,<name>,<value> |
//   SON,ADD,<TYPE>,<name>,<value> | SON,FLUSH | SON,STOP     (old DSL_On format: DATA,v1,v2,...)
// PC -> micro:bit after each server reply:  SON,R,<ready 0/1>,<ok 0/1>,<message>
enum ScienceOnType {
    //% block="temperature"
    TEMP = 0,
    //% block="humidity"
    HMDT = 1,
    //% block="illuminance"
    ILMN = 2,
    //% block="pressure"
    PRES = 3,
    //% block="air pressure"
    APRE = 4,
    //% block="pH"
    PHDR = 5,
    //% block="voltage"
    VOLT = 6,
    //% block="current"
    ECRT = 7,
    //% block="conductivity"
    CDTT = 8,
    //% block="resistance"
    REST = 9,
    //% block="concentration (CO2 etc.)"
    CTRT = 10,
    //% block="noise"
    NOIS = 11,
    //% block="distance"
    DITC = 12,
    //% block="speed"
    VLCT = 13,
    //% block="ultraviolet"
    UTRV = 14,
    //% block="magnetic field"
    MGNT = 15,
    //% block="acceleration"
    ACLR = 16,
    //% block="angle"
    ANGL = 17,
    //% block="force"
    FORC = 18,
    //% block="oxygen saturation"
    SPOT = 19,
    //% block="pulse"
    PSRT = 20,
    //% block="altitude"
    ATTD = 21,
    //% block="angular velocity"
    ANGV = 22,
    //% block="power"
    EPOW = 23,
    //% block="charge"
    ECRG = 24,
    //% block="frequency"
    FRQC = 25,
    //% block="volume"
    VOLM = 26,
    //% block="time"
    TIME = 27,
    //% block="events per hour"
    RATE = 28,
    //% block="other value"
    UVAL = 29
}
//% color=#C27C94 weight=89 block="Intelligent Science Lab ON"
//% groups='["Inquiry","Old DSL_On"]'
namespace scienceOn {
    const TYPE_CODES = ["TEMP", "HMDT", "ILMN", "PRES", "APRE", "PHDR", "VOLT", "ECRT", "CDTT", "REST",
        "CTRT", "NOIS", "DITC", "VLCT", "UTRV", "MGNT", "ACLR", "ANGL", "FORC", "SPOT",
        "PSRT", "ATTD", "ANGV", "EPOW", "ECRG", "FRQC", "VOLM", "TIME", "RATE", "UVAL"]
    let ready = false
    let message = ""
    let listening = false
    // Set by the Bluetooth extension after its Bluetooth start block: SON lines then go over BLE instead of USB.
    export let sendHook: (line: string) => boolean = null

    function sendLine(line: string): boolean {
        if (sendHook) return sendHook(line + "\n")
        listenUSB()
        return scienceData.writeUSBLine(line + "\n")
    }
    function listenUSB(): void {
        if (listening) return
        listening = true
        serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
            handleReply(serial.readUntil(serial.delimiters(Delimiters.NewLine)))
        })
    }
    /** Internal: a reply line from DSL On 2 (USB here, BLE via the Bluetooth extension). */
    export function handleReply(line: string): void {
        line = line.trim()
        if (line.substr(0, 6) != "SON,R,") return
        let parts = line.split(",")
        ready = parts.length > 2 && parts[2] == "1"
        message = parts.length > 4 ? parts.slice(4).join(",") : ""
    }
    function clean(text: string): string {
        let out = ""
        for (let i = 0; i < text.length; i++) {
            let c = text.charAt(i)
            out += c == "," || c == "\n" || c == "\r" ? " " : c
        }
        return out.trim()
    }
    function typeCode(type: ScienceOnType): string {
        return type >= 0 && type < TYPE_CODES.length ? TYPE_CODES[type] : "UVAL"
    }

    /** Copy the group code the teacher made on the Intelligent Science Lab ON site. Open DSL On 2 on the PC and connect the micro:bit first. */
    //% blockId=science_on_start block="Intelligent Science Lab ON start inquiry (group code $code)" group="Inquiry" weight=100
    //% code.defl=""
    export function start(code: string): void {
        ready = false
        message = ""
        sendLine("SON,START," + clean(code))
    }

    /** True after DSL On 2 reports that the inquiry has started and values can be sent. */
    //% blockId=science_on_ready block="Intelligent Science Lab ON ready to send?" group="Inquiry" weight=95
    export function isReady(): boolean { return ready }

    /** The last reply from DSL On 2, e.g. start done or send failed. */
    //% blockId=science_on_status block="Intelligent Science Lab ON reply" group="Inquiry" weight=94
    export function reply(): string { return message }

    /** Name and value are enough; choosing the type helps Intelligent Science Lab ON sort the data. */
    //% blockId=science_on_send_named block="send to Intelligent Science Lab ON name $name value $value (type $type)" group="Inquiry" weight=90
    //% name.defl="온도센서" type.defl=ScienceOnType.TEMP
    export function send(name: string, value: number, type: ScienceOnType): void {
        if (!scienceInternal.finite(value)) return
        sendLine("SON,SEND," + typeCode(type) + "," + clean(name) + "," + value)
    }

    /** Collect a value; send all collected values together with the next block. */
    //% blockId=science_on_add block="put into Intelligent Science Lab ON name $name value $value (type $type)" group="Inquiry" weight=85
    //% name.defl="온도센서" type.defl=ScienceOnType.TEMP
    export function add(name: string, value: number, type: ScienceOnType): void {
        if (!scienceInternal.finite(value)) return
        sendLine("SON,ADD," + typeCode(type) + "," + clean(name) + "," + value)
    }

    /** Send all values put in so far as one row. */
    //% blockId=science_on_flush block="send collected values to Intelligent Science Lab ON at once" group="Inquiry" weight=80
    export function flush(): void { sendLine("SON,FLUSH") }

    /** End the inquiry. */
    //% blockId=science_on_stop block="Intelligent Science Lab ON end inquiry" group="Inquiry" weight=75
    export function stop(): void {
        ready = false
        sendLine("SON,STOP")
    }

    /** Old DSL_On format: several readings as one line "DATA,v1,v2,..." by USB (115200). Names and types are set in DSL On 2. */
    //% blockId=science_on_send block="send values $values to Intelligent Science Lab ON by USB" group="Old DSL_On" weight=20
    export function sendValues(values: number[]): void { trySend(values) }

    /** Old DSL_On format: one reading as "DATA,value" by USB (115200). */
    //% blockId=science_on_send_one block="send measurement $value to Intelligent Science Lab ON by USB" group="Old DSL_On" weight=10
    export function sendValue(value: number): void { trySend([value]) }

    export function trySend(values: number[]): boolean {
        let line = scienceData.encode(values)
        if (line.length == 0) return false
        return scienceData.writeUSBLine("DATA," + line + "\r\n")
    }
}
