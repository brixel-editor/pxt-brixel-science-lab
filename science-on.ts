// Intelligent Science Lab ON (KOFAC) via the DSL_On PC program: USB serial 115200, one line per sample,
// "DATA," followed by the values separated by commas (DSL_On guide, SFEdu). Lines end with \r\n like Arduino println.
//% color=#2E7D5B weight=89 block="Intelligent Science Lab ON"
//% groups='["Send"]'
namespace scienceOn {
    /** Put several sensor readings in the array in order; they are sent as one line "DATA,v1,v2,..." by USB (115200). Run the DSL_On program on the PC. Empty or invalid samples are skipped. */
    //% blockId=science_on_send block="send values $values to Intelligent Science Lab ON by USB" group="Send" weight=90
    export function sendValues(values: number[]): void { trySend(values) }

    /** Put one sensor reading in this block. Sent as "DATA,value" by USB (115200) to the DSL_On program. */
    //% blockId=science_on_send_one block="send measurement $value to Intelligent Science Lab ON by USB" group="Send" weight=80
    export function sendValue(value: number): void { trySend([value]) }

    export function trySend(values: number[]): boolean {
        let line = scienceData.encode(values)
        if (line.length == 0) return false
        return scienceData.writeUSBLine("DATA," + line + "\r\n")
    }
}
