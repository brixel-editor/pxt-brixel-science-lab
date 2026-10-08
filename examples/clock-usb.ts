// DS1307 on I2C. Use appropriate module power and micro:bit-compatible I2C levels.
// Do not connect MPU6050 at the same address (0x68).
// Change 12, 0, 0 to the desired 24-hour time. Press A once when adjusting the clock.
// Do not put setClock in forever: it would keep resetting the time.
input.onButtonPressed(Button.A, function () {
    scienceWeather.setClock(12, 0, 0)
})
basic.forever(function () {
    let second = scienceWeather.clock(ScienceClockValue.Second)
    if (second >= 0) scienceData.sendValueUSB(second)
    basic.pause(1000)
})
