// APDS9960 on I2C; columns are proximity, red, green, blue, completed gesture.
// Direction: 0 none, 1 up, 2 down, 3 left, 4 right.
basic.forever(function () {
    let proximity = scienceDetection.gestureProximity()
    let red = scienceDetection.gestureColor(ScienceColorChannel.Red)
    let green = scienceDetection.gestureColor(ScienceColorChannel.Green)
    let blue = scienceDetection.gestureColor(ScienceColorChannel.Blue)
    let direction = scienceDetection.gestureDirection()
    if (proximity >= 0 && red >= 0 && green >= 0 && blue >= 0 && direction >= 0)
        scienceData.sendUSB([proximity, red, green, blue, direction])
    basic.pause(100)
})
