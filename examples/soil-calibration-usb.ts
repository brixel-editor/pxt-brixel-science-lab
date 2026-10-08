// 같은 흙·삽입 깊이에서 A=마른 흙, B=젖은 흙 순서로 보정합니다.
input.onButtonPressed(Button.A, function () {
    scienceWater.calibrateSoil(ScienceAnalogPin.P1, ScienceSoilReference.Dry)
})
input.onButtonPressed(Button.B, function () {
    scienceWater.calibrateSoil(ScienceAnalogPin.P1, ScienceSoilReference.Wet)
})
basic.forever(function () {
    let value = scienceWater.soilMoisturePercent(ScienceAnalogPin.P1)
    if (value >= 0) scienceData.sendValueUSB(value)
    basic.pause(200)
})
