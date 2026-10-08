// A_016/017/018: 5V sensor power, VO divider to P1, voltage-compatible LED driver on P8.
// Verify the adapter's LED polarity and signal voltage before wiring. No active microphone.
// Raw 0..1023; not calibrated mass concentration or PM2.5.
basic.forever(function () {
    let raw = scienceAir.analogDust(ScienceAnalogPin.P1, ScienceDigitalPin.P8)
    if (raw >= 0) scienceData.sendValueUSB(raw)
    basic.pause(200)
})
