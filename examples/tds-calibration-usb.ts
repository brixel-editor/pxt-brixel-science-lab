// TDS=P1, DS18B20=P8. 용액과 프로브의 온도가 안정된 뒤 A로 보정합니다.
// 707은 환산계수 0.5의 25°C 기준 표준용액 예입니다. 실제 용액 표기로 바꿉니다.
input.onButtonPressed(Button.A, function () {
    scienceWater.calibrateTDS(ScienceAnalogPin.P1, 707, scienceWater.temperature(ScienceDigitalPin.P8, 1))
})
basic.forever(function () {
    let value = scienceWater.tds(ScienceAnalogPin.P1, scienceWater.temperature(ScienceDigitalPin.P8, 1))
    if (value >= 0) scienceData.sendValueUSB(value)
    basic.pause(1000)
})
