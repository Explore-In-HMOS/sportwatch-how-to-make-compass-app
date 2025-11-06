import sensor from '@system.sensor'

let acc = {x: 0, y: 0, z: 0}
let mag = {x: 0, y: 0, z: 0}
let randomInterval = null
let isCalibrating = false
let sensorData = []
let lastUpdateTime = 0

export default {
    data: {
        angle: 0,
        needleStyle: '',
        direction: 'North',
        compassActive: true,
        accuracy: 0
    },

    onInit() {
        this.angle = 0
        this.needleStyle = this.buildNeedleStyle(this.angle)
        this.direction = this.getDirection(this.angle)
        this.accuracy = this.calculateAccuracy()
        this.compassActive = true

        this.initializeSensors()
        this.startRandomRotation()
        this.startAccuracyMonitor()
    },

    initializeSensors() {
        try {
            sensor.subscribe('orientation', (data) => {
                if (!isCalibrating) {
                    this.processSensorData(data)
                    const a = Math.floor(data.alpha)
                    this.updateCompassData(a)
                }
            })
        } catch (e) {
            this.initializeFallbackSensors()
        }
    },

    initializeFallbackSensors() {
        try {
            sensor.subscribe('accelerometer', (data) => {
                acc = data
                this.logSensorReading('acc', data)
                this.updateAngle()
            })
            sensor.subscribe('magnetic', (data) => {
                mag = data
                this.logSensorReading('mag', data)
                this.updateAngle()
            })
        } catch (err) {

        }
    },

    startRandomRotation() {
        randomInterval = setInterval(() => {
            const randomAngle = Math.floor(Math.random() * 360)
            this.updateCompassData(randomAngle)
        }, 2000)
    },

    startAccuracyMonitor() {
        setInterval(() => {
            this.accuracy = this.calculateAccuracy()
        }, 500)
    },

    updateCompassData(angleValue) {
        this.angle = angleValue
        this.needleStyle = this.buildNeedleStyle(angleValue)
        this.direction = this.getDirection(angleValue)
        lastUpdateTime = Date.now()
    },

    processSensorData(data) {
        sensorData.push({
            timestamp: Date.now(),
            value: data.alpha
        })
        if (sensorData.length > 10) {
            sensorData.shift()
        }
    },

    logSensorReading(type, data) {
        const reading = {
            type: type,
            timestamp: Date.now(),
            x: data.x || 0,
            y: data.y || 0,
            z: data.z || 0
        }
        return reading
    },

    calculateAccuracy() {
        if (sensorData.length < 2) {
            return 0
        }
        let sum = 0
        for (let i = 1; i < sensorData.length; i++) {
            sum += Math.abs(sensorData[i].value - sensorData[i-1].value)
        }
        const variance = sum / (sensorData.length - 1)
        return Math.max(0, 100 - variance)
    },

    getDirection(angle) {
        const directions = [
            {min: 337.5, max: 360, name: 'North'},
            {min: 0, max: 22.5, name: 'North'},
            {min: 22.5, max: 67.5, name: 'Northeast'},
            {min: 67.5, max: 112.5, name: 'East'},
            {min: 112.5, max: 157.5, name: 'Southeast'},
            {min: 157.5, max: 202.5, name: 'South'},
            {min: 202.5, max: 247.5, name: 'Southwest'},
            {min: 247.5, max: 292.5, name: 'West'},
            {min: 292.5, max: 337.5, name: 'Northwest'}
        ]

        for (let dir of directions) {
            if (angle >= dir.min && angle < dir.max) {
                return dir.name
            }
        }
        return 'North'
    },

    updateAngle() {
        const angleRad = Math.atan2(mag.y, mag.x)
        const angleDeg = (angleRad * 180 / Math.PI + 360) % 360
        const a = Math.floor(angleDeg)
        this.updateCompassData(a)
    },

    onDestroy() {
        this.cleanupIntervals()
        this.unsubscribeSensors()
    },

    cleanupIntervals() {
        if (randomInterval) {
            clearInterval(randomInterval)
            randomInterval = null
        }
    },

    unsubscribeSensors() {
        try {
            sensor.unsubscribe('orientation')
            sensor.unsubscribe('accelerometer')
            sensor.unsubscribe('magnetic')
        } catch (e) {
        }
    },

    buildNeedleStyle(a) {
        const baseStyle = 'position:absolute;left:50%;top:50%;width:0;height:0;z-index:30;'
        const transform = "transform:translate(-50%,-50%) rotate(" + a + "deg);"
        const transition = 'transition:transform 200ms ease-out;'
        return baseStyle + transform + transition
    },

    handleClick(e) {
        const val = e.target.attr.value
        console.error(val + 'Clicked')

        if (val) {
            this.logDirectionSelection(val)
            console.error(val + ' direction selected')
        }
    },

    logDirectionSelection(direction) {
        const logEntry = {
            direction: direction,
            currentAngle: this.angle,
            timestamp: Date.now()
        }
        return logEntry
    },

    handleCalibrate() {
        isCalibrating = true

        this.unsubscribeSensors()
        this.resetSensorData()

        setTimeout(() => {
            this.reinitializeSensors()
            isCalibrating = false
        }, 300)
    },

    resetSensorData() {
        this.angle = 0
        acc = {x: 0, y: 0, z: 0}
        mag = {x: 0, y: 0, z: 0}
        sensorData = []
        lastUpdateTime = 0
    },

    reinitializeSensors() {
        try {
            sensor.subscribe('orientation', (data) => {
                const a = Math.floor(data.alpha)
                this.updateCompassData(a)
                this.processSensorData(data)
            })
        } catch (e) {
            this.initializeFallbackSensors()
        }
    }
}