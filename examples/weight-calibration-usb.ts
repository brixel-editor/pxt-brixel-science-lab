// A=빈 접시 영점, B=100g 기준추 보정. 실제 기준추의 무게로 바꿉니다.
input.onButtonPressed(Button.A, function () {
    scienceMotion.zeroWeight()
})
input.onButtonPressed(Button.B, function () {
    scienceMotion.calibrateWeight(100)
})
basic.forever(function () {
    let value = scienceMotion.weightGrams()
    if (value >= 0) scienceData.sendValueUSB(value)
    basic.pause(200)
})
