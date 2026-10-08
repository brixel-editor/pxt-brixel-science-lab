// Simulator fallbacks report unavailable hardware rather than fabricated sensor readings.
namespace scienceNative {
    //% shim=scienceNative::startSensorUART
    export function startSensorUART(rx: number, tx: number): boolean { return false }
    //% shim=scienceNative::readSensorUART
    export function readSensorUART(): Buffer { return pins.createBuffer(0) }
    //% shim=scienceNative::writeSensorUART
    export function writeSensorUART(data: Buffer): boolean { return false }
    //% shim=scienceNative::readI2C
    export function readI2C(address: number, size: number): Buffer { return pins.createBuffer(size + 1) }
    //% shim=scienceNative::showPixels
    export function showPixels(pin: number, data: Buffer): boolean { return false }
}
namespace scienceBus {
    // Cooperative lock spans measurement waits so two fibers cannot overlap commands.
    let busy = false
    export function acquire(): void { while (busy) basic.pause(1); busy = true }
    export function release(): void { busy = false }
    export function write(address: number, data: number[], repeated: boolean = false): boolean {
        return pins.i2cWriteBuffer(address, pins.createBufferFromArray(data), repeated) == 0
    }
    export function read(address: number, size: number): Buffer {
        let result = scienceNative.readI2C(address, size)
        if (result.length != size + 1 || result[0] != 1) return null
        return result.slice(1, size)
    }
    export function register(address: number, register: number, size: number): Buffer {
        if (!write(address, [register], true)) return null
        return read(address, size)
    }
    export function u16(data: Buffer, offset: number): number { return data[offset] | data[offset + 1] << 8 }
    export function s16(data: Buffer, offset: number): number {
        let value = u16(data, offset)
        return value & 0x8000 ? value - 65536 : value
    }
    export function be16(data: Buffer, offset: number): number { return data[offset] << 8 | data[offset + 1] }
    export function signedBE(data: Buffer, offset: number): number {
        let value = be16(data, offset)
        return value & 0x8000 ? value - 65536 : value
    }
    export function crc8(data: Buffer, start: number, length: number, initial: number, polynomial: number): number {
        let crc = initial
        for (let i = start; i < start + length; i++) {
            crc ^= data[i]
            for (let bit = 0; bit < 8; bit++) crc = ((crc & 128) ? (crc << 1) ^ polynomial : crc << 1) & 255
        }
        return crc
    }
}
