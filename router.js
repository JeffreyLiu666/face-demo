const express = require('express')
const multer = require('multer')
const router = express.Router()
const fs = require('fs')
const path = require('path')

router.get('/hello', (req, res, next) => {
    res.json({res: 'hello'})
})

router.get('/getInfo', (req, res, next) => {
    console.log('haha')
    res.json({name: 'bob'})
})

router.post('/upload64', (req, res, next) => {
    console.log('haha')
    res.json({name: 'bob'})
})

router.post('/upload', multer({dest: '/tmp/'}).array('image'), (req, res, next) => {
    console.log(req.files[0])
    console.log(req.body)
    if (req.files.length === 0) {
        return res.send({message: '没拿到文件'})
    }
    fs.readFile(req.files[0].path, async (err, data) => {
        if (err) {
            throw(err)
        }
        let fileDir = path.join(path.resolve('.'), 'upload', 'images')
        // 创建文件夹
        await createDir(fileDir)
        // 获取扩展名
        let ext = path.extname(req.files[0].originalname) || '.jpg'
        let filename = new Date().getTime().toString() + ext
        let filePath = path.join(fileDir, filename)
        fs.writeFile(filePath, data, (err) => {
            if (err) {
                throw err
            }
            res.send({message: 'success', path: '/file/images/' + filename})
            // res.redirect('/file/images/' + filename)
        })
    })
})

async function createDir (dirPath = __dirname) {
    if (fs.existsSync(dirPath)) return
    // 创建文件夹
    fs.mkdirSync(dirPath, {recursive: true})
    // await new Promise((resolve, reject) => {
    //     fs.mkdir(dirPath, {recursive: true}, (err) => {
    //         if (err) {
    //             throw err
    //         }
    //         resolve()
    //     })
    // })
}

module.exports = router