// WunderVision 2024
// https://www.wundervisionengineering.com/

const express = require('express');
const body_parser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 8080;

Date.prototype.getFileFormat = ()=>{
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = now.getMonth().toString().padStart(2,'0');
    const day = now.getDay().toString().padStart(2,'0');
    const hour = now.getHours().toString().padStart(2,'0');
    const minute = now.getMinutes().toString().padStart(2,'0');
    const second = now.getSeconds().toString().padStart(2,'0');
    return `${year}-${month}-${day}-${hour}${minute}${second}`;
}

const testFile = "base_test.jpg";
const testFileRoot = "/mnt/d/Documents/Time_Lapse"
const allPhotos = [
    { url: 'http://192.168.1.125:1515/2024-04-01-120000.jpg', time: '2024-04-01-120000' },
    { url: 'http://192.168.1.125:1515/2024-03-31-160000.jpg', time: '2024-03-31-160000' },
    { url: 'http://192.168.1.125:1515/2024-03-31-120000.jpg', time: '2024-03-31-120000' }
];

app.use(body_parser.json());
app.use(function (req, res, next) {
    let origin = req.headers.origin;
    res.header("Access-Control-Allow-Origin", req.headers.host.indexOf("localhost") > -1 ? "http://localhost:3000" : origin);
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    //res.header('Access-Control-Allow-Credentials', true);
    next();
});


app.get('/recent', (req, res) => {
    res.json(allPhotos.slice(0, 10));
});

function findPhotoIndexByID(id) {
    if (id == undefined) {
        throw 'Missing "id" query parameter';
    }
    const index = allPhotos.findIndex(photo => {
        return photo.time == id;
    });

    if (index == -1) {
        throw 'Could not find photo';
    }

    return index;
}

app.get('/next', (req, res) => {
    const id = req.query.id;
    try {
        const index = findPhotoIndexByID(id);
        const next_index = index - 1;
        if (next_index < 0) {
            throw 'No more photos';
        }
        res.json(allPhotos[next_index]);
    } catch (e) {
        res.status(400).json({ error: e });
    }
});

app.get('/previous', (req, res) => {
    const id = req.query.id;
    try {
        const index = findPhotoIndexByID(id);
        const pervious_index = index + 1;
        if (pervious_index >= allPhotos.length) {
            throw 'No more photos';
        }
        res.json(allPhotos[pervious_index]);
    } catch (e) {
        res.status(400).json({ error: e });
    }
});

app.get('/capture', (req, res) => {
    const now = new Date();
    const timeString = now.getFileFormat();
    const fileName = `${timeString}.jpg`;
    const originalFile = path.join(testFileRoot, testFile);
    const newFile = path.join(testFileRoot, fileName);
    fs.copyFile(originalFile, newFile, (copyResult)=>{
        console.log(copyResult);
        const imageObject = { url: `http://192.168.1.125:1515/${fileName}`, time: timeString }
        allPhotos.unshift(imageObject);
        res.json(imageObject);
    });
});

app.post('/delete', (req, res) => {
    const image_info = req.body;
    console.log(image_info.id)
    try {
        const index = findPhotoIndexByID(image_info.id);
        allPhotos.splice(index, 1);
        res.status(200).send();
    } catch (e) {
        res.status(400).json({ error: e });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
