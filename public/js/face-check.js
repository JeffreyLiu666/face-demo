

navigator.getUserMedia = navigator.getUserMedia
    || navigator.webkitGetUserMedia
    || navigator.mozGetUserMedia
window.requestAnimationFrame = window.requestAnimationFrame
                                || window.mozRequestAnimationFrame
                                || window.webkitRequestAnimationFrame
                                || window.msRequestAnimationFrame
                                || function (cb) {
                                    return setTimeout(cb, 1000 / 60)
                                }
window.cancelAnimationFrame = window.cancelAnimationFrame
                            || window.mozCancelAnimationFrame
                            || function (id) {
                                clearTimeout(id)
                            }

const widthMax = 320
// const height = 480
let width = window.innerWidth < widthMax ? window.innerWidth : widthMax // video宽度
let height = parseInt(width / 3 * 4) // video高度
const inputSize = 128 // 值越小越快，但小脸精度下降，要能被32整除
const score = 0.6 // 人脸识别可靠度阈值
const tipY = height / 2 + height / 4 // 文字提示的y值，x默认为区中
// const SSD_MOBILENETV1 = 'ssd_mobilenetv1'
// const MTCNN = 'mtcnn'
const TINY_FACE_DETECTOR = 'tiny_face_detector' // 模型，该模型体量小适合摄像头人脸识别
const img = document.getElementById('img')
const video = document.getElementById('video')
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
const frameCanvas = document.getElementById('frameCanvas')
let mediaStreamTrack = null
let animation = null
let isTakePhoto = false // 是否拍下首张照片
let isStartAlive = false
let isAliveFail = false // 是否检测失败
let isAliveSuc = false // 是否检测成功
let max_dis_mouse = 1 // 内嘴唇最大间距
let min_dis_mouse = 1 // 内嘴唇最小间距
let dis_mouse_out = 1 // 起始外嘴唇间距
let minCanvas = null
let maxCanvas = null
let photoCanvas = null

async function loop () {
    if (isAliveFail || isAliveSuc) {
        return
    }
    // 先清除画布
    // clearCanvas()
    // inputSize：值越小越快，但小脸精度下降，要能被32整除
    // scoreThreshold: 信任度阈值，判断是否为人脸的阈值
    const options = new faceapi.TinyFaceDetectorOptions({inputSize, scoreThreshold: score})
    // 检测所有脸部信息
    // const result = await faceapi.detectAllFaces(video, options)
    // 检测最高可信度的脸部
    const result = await faceapi.detectSingleFace(video, options)
                                .withFaceLandmarks()
                                // .withFaceDescriptor()
    if (result) {
        // console.log(result)
        // const faceMatcher = new faceapi.FaceMatcher(result)
        // console.log(faceMatcher.findBestMatch(result.descriptor))
        // 默认返回第二个参数的宽高，如果第三个参数为true则返回第二个参数的原始尺寸，且都会更改第一个参数的宽高
        const dims = faceapi.matchDimensions(canvas, video, false)
        // 将检测到的坐标根据画布尺寸适配
        const resizeResults = faceapi.resizeResults(result, dims)
        // 绘制人脸定位框
        // faceapi.draw.drawDetections(canvas, resizeResults)
        // 绘制特征点
        // faceapi.draw.drawFaceLandmarks(canvas, resizeResults)
        // 绘制表情文字
        // const minProbability = 0.05
        // faceapi.draw.drawFaceExpressions(canvas, resizeResults, minProbability)
        // 自定义绘制框
        // console.log(resizeResults)
        clearCanvas()
        // 绘制人脸位置的框
        // customDrawBox(canvas, resizeResults)
        drawText('请张合嘴巴', {fontSize: 22, fontSize: 'Arial', x: canvas.width / 2, y: tipY})
        // 建立起始外嘴唇间距，并拍下第一张照片
        if (!isTakePhoto) {
            let up_out = resizeResults.landmarks.positions[51]
            let dw_out = resizeResults.landmarks.positions[57]
            let x_mouse_out = Math.abs(up_out.x - dw_out.x)
            let y_mouse_out = Math.abs(up_out.y - dw_out.y)
            dis_mouse_out = Math.pow(x_mouse_out * x_mouse_out + y_mouse_out * y_mouse_out, 0.5)
            takePhoto('photo')
            // setTimeout(() => {
            //     if (isAliveSuc) return
            //     isAliveFail = true
            //     clearCanvas()
            //     console.log('fail')
            //     drawText('检测失败', {x: canvas.width / 2, y: tipY, fontSize: 22})
            //     close()
            // }, 5000)
        }
        // if (!isStartAlive) {
        //     return requestAnimationFrame(loop)
        // }
        let up = resizeResults.landmarks.positions[62]
        let dw = resizeResults.landmarks.positions[66]
        // 上下内嘴唇的距离
        let x_mouse = Math.abs(up.x - dw.x)
        let y_mouse = Math.abs(up.y - dw.y)
        let dis_mouse = Math.pow(x_mouse * x_mouse + y_mouse * y_mouse, 0.5)
        if (dis_mouse > max_dis_mouse) {
            // 记录当前内嘴唇最大距离
            max_dis_mouse = dis_mouse
            takePhoto('max')
        } else if(dis_mouse < min_dis_mouse) {
            // 记录当前内嘴唇最小距离
            min_dis_mouse = dis_mouse
            takePhoto('min')
        }
        // 如果内嘴唇最大间距减去最小间距的差比起始外嘴唇间距的一半大，则pass
        if (max_dis_mouse - min_dis_mouse > dis_mouse_out / 2) {
            console.log('success')
            isAliveSuc = true
            clearCanvas()
            drawText('检测通过', {x: canvas.width / 2, y: tipY, fontSize: 22})
            close()
            return
        }
    } else {
        clearCanvas()
        drawText('未检测到人脸，请靠近并正视摄像头。', {x: canvas.width / 2, y: tipY})
    }
    animation = requestAnimationFrame(loop)
}

let seconds = 2
function start () {
    setTimeout(() => {
        clearCanvas()
        const options = {
            fontSize: 22,
            fontStyle: 'Arial',
            x: canvas.width / 2,
            y: tipY
        }
        drawText(`${seconds}秒后开始人脸识别`, options)
        if (seconds === 0) {
            seconds = 2
            loop()
        } else {
            seconds--
            start()
        }
    }, 1000)
}

function close () {
    // document.getElementById('photo')photoCanvas.toDataURL()
    console.log('close')
    cancelAnimationFrame(animation)
    mediaStreamTrack && mediaStreamTrack.stop()
}

function handleError (e) {
    console.dir(e)
    if (e.name === 'PermissionDeniedError' || e.name === 'NotAllowedError') {
        alert('请同意浏览器请求媒体的权限。')
    }
    else if (e.name === 'NotReadableError') {
        alert('对不起，您的浏览器不支持拍照功能，请升级或更换浏览器后操作。')
    }
    else if (e.name === 'NotReadableError' || e.name === 'NotFoundError') {
        alert('您的摄像头可能未正确安装或不支持指定分辨率。')
    }
    else if (e.name === 'MyError') {
        alert(e.message)
    }
    else alert('发生未知错误，请刷新后重试。\n' + e)
}
// console.log(faceapi)
// async function test () {
//     await faceapi.nets.tinyFaceDetector.load('./weights')
//     await faceapi.loadFaceLandmarkModel('./weights')
//     const options = new faceapi.TinyFaceDetectorOptions({inputSize, scoreThreshold: score})
//     const results = await faceapi.detectSingleFace(img, options).withFaceLandmarks()
//     console.log(results)
//     // 48 - 68
//     const resizeResults = faceapi.resizeResults(results, faceapi.matchDimensions(canvas, img))
//     faceapi.draw.drawFaceLandmarks(canvas, resizeResults)
//     for (let ind in resizeResults.landmarks.positions) {
//         let item = resizeResults.landmarks.positions[ind]
//         // drawText(ind, {fontSize: 10, x: item.x, y: item.y, fontColor: 'red'})
//         if (ind == 51 || ind == 51 || ind == 51) {
//             drawText(ind, {fontSize: 10, x: item.x, y: item.y})
//         }
//         if (ind == 57 || ind == 57 || ind == 57) {
//             drawText(ind, {fontSize: 10, x: item.x, y: item.y, fontColor: 'red'})
//         }
//     }
// }
// test()

function clearCanvas () {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
}

function drawText (text = '', options = {}) {
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2
    ctx.shadowBlur = 2
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
    const maxWidth = canvas.width - 60
    const fontSize = options.fontSize || 16
    const fontStyle = options.fontStyle || 'Georgia'
    const textAlign = options.textAlign || 'center'
    const fontColor = options.fontColor || 'rgba(255, 255, 0, .8)'
    const x = options.x || 0
    const y = options.y || 0
    ctx.font = `${fontSize}px ${fontStyle}`
    ctx.textAlign = textAlign
    ctx.fillStyle = fontColor
    ctx.fillText(text, x, y, maxWidth)
}

// 自定义绘制人脸框
function customDrawBox (canvas, face) {
    const detectionsArray = Array.isArray(face) ? face : [face]
    detectionsArray.forEach(f => {
        const box = f instanceof faceapi.FaceDetection
        ? f.box
        : (faceapi.isWithFaceDetection(f) ? f.detection.box : undefined)
        // console.log(box)
        if (!box) return
        new faceapi.draw.DrawBox(box, {}).draw(canvas)
    })
}

function drawFrame () {
    const fCtx = frameCanvas.getContext('2d')
    let pic = new Image()
    pic.src = '../img/frame.png'
    pic.onload = function () {
        fCtx.drawImage(pic, 0, 0, video.width, video.height)
    }
}

// 获取摄像头
async function getMedia () {
    const containers = {
        video: {
            width: {exact: width},
            height: {exact: height},
            facingMode: 'user'
        }
    }
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        document.body.append('new')
        return await navigator.mediaDevices.getUserMedia(containers)
    }
    else if (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia) {
        let funcName = navigator.getUserMedia ? 'getUserMedia' : (navigator.webkitGetUserMedia ? 'webkitGetUserMedia' : 'mozGetUserMedia')
        return new Promise(function (resolve, reject) {
            navigator[funcName](containers, function (stream) {
                resolve(stream)
            }, function (err) { reject(err) })
        })
    }
    if (browser.versions.wechat) {
        throw new MyError('当前微信环境无法正常使用，请在其他浏览器中打开。')
    } else {
        throw new MyError('浏览器版本过低，请更换浏览器或升级后重试。')
    }
}

function takePhoto (type) {
    let pCanvas = type === 'photo' ? document.getElementById('photo') : document.createElement('canvas')
    pCanvas.width = canvas.width / 2
    pCanvas.height = canvas.height / 2
    let pContext = pCanvas.getContext('2d')
    pContext.drawImage(video, 0, 0, pCanvas.width, pCanvas.height)
    // console.log(pCanvas.toDataURL())
    isTakePhoto = true
    isStartAlive = true
    switch (type) {
        case 'photo':
            photoCanvas = pCanvas
            break
        case 'min':
            minCanvas = pCanvas
            break
        case 'max':
            maxCanvas = pCanvas
            break
    }
}

class MyError extends Error {
    constructor (message = 'error') {
        super(message)
        this.name = 'MyError'
    }
}

let browser = {
    versions: function () {
        var u = navigator.userAgent, app = navigator.appVersion;
        return {         //移动终端浏览器版本信息
            trident: u.indexOf('Trident') > -1, //IE内核
            presto: u.indexOf('Presto') > -1, //opera内核
            webKit: u.indexOf('AppleWebKit') > -1, //苹果、谷歌内核
            gecko: u.indexOf('Gecko') > -1 && u.indexOf('KHTML') == -1, //火狐内核
            mobile: !!u.match(/AppleWebKit.*Mobile.*/), //是否为移动终端
            ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端
            android: u.indexOf('Android') > -1 || u.indexOf('Linux') > -1, //android终端或uc浏览器
            iPhone: u.indexOf('iPhone') > -1, //是否为iPhone或者QQHD浏览器
            iPad: u.indexOf('iPad') > -1, //是否iPad
            webApp: u.indexOf('Safari') == -1, //是否web应该程序，没有头部与底部
            wechat: u.indexOf('MicroMessenger') > -1
        };
    }()
}

async function init () {
    // 加载模型
    await faceapi.nets.tinyFaceDetector.load('./js/weights')
    await faceapi.loadFaceLandmarkModel('./js/weights')
    // await faceapi.loadFaceRecognitionModel('./weights')
    // 打开摄像头
    // const stream = await navigator.mediaDevices.getUserMedia({video: {}})
    const mediaStream = await getMedia()
    // 媒体流结束时结束人脸识别
    mediaStream.onended = function () {
        console.log('ended')
        cancelAnimationFrame(animation)
    }
    // 获取通道，主要用于停止摄像头
    mediaStreamTrack = typeof mediaStream.stop === 'function' ? mediaStream : mediaStream.getTracks()[0]
    // video.width = width
    // video.height = height
    // 将摄像头的流给video
    // video.srcObject = (window.URL || window.webkitURL).createObjectURL(mediaStreamTrack)
    try {
        video.srcObject = mediaStream
        video.setAttribute('playsinline', true)
        video.setAttribute('controls', true)
    }
    catch (e) {
        video.srcObject = window.URL.createObjectURL(mediaStream)
    }
    // while (video.videoWidth === 0) {}
    // video.width = video.videoWidth
    // video.height = video.videoHeight
    // faceapi.matchDimensions(frameCanvas, video, false)
    // faceapi.matchDimensions(canvas, video, false)
    // drawFrame()
    // start()
    // 等video加载成功后检测
    video.oncanplay = async () => {
        video.removeAttribute('controls')
        // video.width = video.videoWidth
        // video.height = video.videoHeight
        video.width = width
        video.height = height
        faceapi.matchDimensions(frameCanvas, video, false)
        faceapi.matchDimensions(canvas, video, false)
        drawFrame()
        video.play()
        start()
    }
}

init().catch(handleError)