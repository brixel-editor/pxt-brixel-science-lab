enum ScienceClockValue {
    //% block="hour"
    Hour = 0,
    //% block="minute"
    Minute = 1,
    //% block="second"
    Second = 2
}
namespace scienceWeather {
    function clockBCD(value: number): number {
        if ((value & 15) > 9 || (value >> 4) > 9) return -1
        return (value >> 4) * 10 + (value & 15)
    }
    /** DS1307 already set and running, address 0x68. Reads only; does not set the clock. Needs appropriate power/I2C level shifting. Do not share its address with MPU6050. Invalid/halted=-1. */
    //% blockId=science_clock block="RTC clock $value" group="Clock"
    export function clock(value: ScienceClockValue): number {
        if (value < 0 || value > 2 || value != Math.floor(value)) return -1
        scienceBus.acquire()
        let data = scienceBus.register(0x68, 0, 7)
        scienceBus.release()
        if (!data || (data[0] & 128) || (data[1] & 128) || (data[2] & 128)) return -1
        let second = clockBCD(data[0]), minute = clockBCD(data[1])
        let hour = clockBCD(data[2] & (data[2] & 64 ? 31 : 63))
        if (data[2] & 64) {
            if (hour < 1 || hour > 12) return -1
            hour = hour % 12 + ((data[2] & 32) ? 12 : 0)
        }
        let day = clockBCD(data[4]), month = clockBCD(data[5]), year = clockBCD(data[6])
        if (second < 0 || second > 59 || minute < 0 || minute > 59 || hour < 0 || hour > 23 ||
            data[3] < 1 || data[3] > 7 || month < 1 || month > 12 || day < 1 || year < 0) return -1
        let days = [31, year % 4 == 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        if (day > days[month - 1]) return -1
        return value == ScienceClockValue.Hour ? hour : (value == ScienceClockValue.Minute ? minute : second)
    }
}
