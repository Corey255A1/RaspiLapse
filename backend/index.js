// WunderVision 2024
// https://www.wundervisionengineering.com/

const express = require('express');

const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const version = parseFloat(process.version.substring(1))
console.log(version);
const fetchWrap = version < 18 ? require('node-fetch') : fetch;
const app = express();
const serverPort = process.env.RASPI_SRV_PORT || 8989;
const cameraPort = process.env.RASPI_CAM_PORT || 7070;
const imageStorePath = process.env.RASPI_STORE || "/mnt/d/Documents/Time_Lapse";
const imageStoreFileName = process.env.RASP_STORE_FILE || "file_list.json";
const imageStoreFilePath = path.join(imageStorePath, imageStoreFileName);
const imageStoreURL = process.env.RASPI_IMG_URL || 'http://192.168.1.125:1515';
const currentCameras = [{ ip: "192.168.1.106", status: "good" }];

Date.prototype.getFileFormat = () => {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const second = now.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day}-${hour}${minute}${second}`;
}
/**
 * @typedef {Object} ImageObject
 * @property {string} url
 * @property {string} time
 */

/**
 * @type {Array<ImageObject>}
 */
let imageObjectList = null;
let dailyStartHour = 10;
let dailyEndHour = 18;
let picturesPerDay = 3;
let currentPictureCount = 0;
let pictureIntervalHours = (process.env.CAM_HOURS || 2);
let nextPictureHour = -1;
let lastDate = new Date();
let lastInterval = Date.now();
let checkIntervalMS = ((process.env.CAM_INTERVAL || 15) * 60 * 1000);

function isNowInTimeRange() {
    const currentHour = (new Date()).getHours();
    return (currentHour >= dailyStartHour) && (currentHour < dailyEndHour);
}

async function processCamera() {
    if(!(await isObjectDetected(currentCameras[0]))){
        console.log("Updating");
        await updateCameraBackground(currentCameras[0]);
        return false;
    } else {
        console.log("capturing");
        await captureAndSaveCameraImage(currentCameras[0]);
        return true;
    }
}

async function cameraCheckInterval() {
    const currentInterval = Date.now()
    const waitTime = (lastInterval + checkIntervalMS) - currentInterval;
    lastInterval = currentInterval;
    console.log(lastInterval)
    setTimeout(cameraCheckInterval, waitTime);

    if(!isNowInTimeRange()){ return; }

    const currentDate = new Date();
    if(currentDate.getDate() != lastDate.getDate()) {
        currentPictureCount = 0;
        nextPictureHour = -1;
    }
    lastDate = currentDate;

    if(currentPictureCount >= picturesPerDay ||
        currentDate.getHours() < nextPictureHour) 
    { 
        return; 
    }
    console.log("Processing");
    if((await processCamera())) {
        currentPictureCount += 1;
        nextPictureHour = currentDate.getHours() + pictureIntervalHours;
    }
}

function loadImageObjectListFromDisk() {
    try {
        return JSON.parse(fs.readFileSync(imageStoreFilePath).toString());;
    } catch (e) {
        return [];
    }
}

function saveImageObjectListToDisk() {
    fs.writeFile(imageStoreFilePath, JSON.stringify(imageObjectList), (error)=>{
        if(error){console.log(error);}
    });
}

function findImageIndexByID(id) {
    if (id == undefined) {
        throw 'Missing "id" query parameter';
    }
    const index = imageObjectList.findIndex(photo => {
        return photo.time == id;
    });

    if (index == -1) {
        throw 'Could not find photo';
    }

    return index;
}

async function getCameraImage(camera) {
    const camRes = await fetchWrap(`http://${camera.ip}:${cameraPort}/get_photo`);
    if ((!camRes && camRes.ok)) { throw "could not get image"; }
    return await camRes.arrayBuffer();
}

async function isObjectDetected(camera) {
    const camRes = await fetchWrap(`http://${camera.ip}:${cameraPort}/is_object_detected`);
    if ((!camRes && camRes.ok)) { throw "could not get response"; }
    const responseObject = await camRes.json();
    return responseObject.detected > 200;
}

async function updateCameraBackground(camera) {
    const camRes = await fetchWrap(`http://${camera.ip}:${cameraPort}/update_background_image`);
    if ((!camRes && camRes.ok)) { throw "could not update background"; }
    return true;
}

function saveCameraImage(imageBuffer) {
    const now = new Date();
    const timeString = now.getFileFormat();
    const fileName = `${timeString}.jpg`;
    const filePath = path.join(imageStorePath, fileName);
    const imageObject = { url: `${imageStoreURL}/${fileName}`, time: timeString }
    imageObjectList.unshift(imageObject);
    fs.writeFile(filePath, Buffer.from(imageBuffer), (error) => {
        if(error){console.log(error);}
    });
    return imageObject;
}

async function captureAndSaveCameraImage(camera) {
    const buffer = await getCameraImage(camera);
    const imageObject = saveCameraImage(buffer);
    saveImageObjectListToDisk();
    return imageObject;
}

function deleteImageByID(id){
    const index = findImageIndexByID(id);
    const oldImages = imageObjectList.splice(index, 1);
    const fileName = `${oldImages[0].time}.jpg`;
    const filePath = path.join(imageStorePath, fileName);
    console.log(`Deleting ${filePath}`);
    // Old NodeJS doesn't have rm
    fs.unlink(filePath, (error)=>{
        if(error){console.log(error);}
    })
}

function findCamera(cameraIP) {
    return currentCameras.find(cameraData => cameraData.ip == cameraIP);
}

async function updateCameraStatus(camera) {
    try {
        const camRes = await fetchWrap(`http://${camera.ip}:${cameraPort}/status`);
        if (!(camRes && camRes.ok)) {
            camera.status = "bad response";
        } else {
            camera.status = (await camRes.json()).status;
        }
    } catch (e) {
        console.log(e);
        camera.status = "could not get status";
    }
    console.log(camera)
}

function registerCamera(clientIP) {
    let camera = findCamera(clientIP);
    if (!camera) {
        camera = { ip: clientIP, status: "unknown" };
        currentCameras.push(camera);
    }
    updateCameraStatus(camera);
}



app.use(bodyParser.json());
app.use(function (req, res, next) {
    let origin = req.headers.origin;
    res.header("Access-Control-Allow-Origin", req.headers.host.indexOf("localhost") > -1 ? "http://localhost:3000" : origin);
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    //res.header('Access-Control-Allow-Credentials', true);
    next();
});


app.get('/recent', (req, res) => {
    res.json(imageObjectList.slice(0, 10));
});

app.get('/next', (req, res) => {
    const id = req.query.id;
    try {
        const index = findImageIndexByID(id);
        const nextIndex = index - 1;
        if (nextIndex < 0) {
            throw 'No more photos';
        }
        res.json(imageObjectList[nextIndex]);
    } catch (e) {
        res.status(400).json({ error: e.toString() });
    }
});

app.get('/previous', (req, res) => {
    const id = req.query.id;
    try {
        const index = findImageIndexByID(id);
        const pervious_index = index + 1;
        if (pervious_index >= imageObjectList.length) {
            throw 'No more photos';
        }
        res.json(imageObjectList[pervious_index]);
    } catch (e) {
        res.status(400).json({ error: e.toString() });
    }
});

app.get('/capture', async (req, res) => {
    if (currentCameras.length == 0) {
        res.status(404).send("No cameras");
        return;
    }
    try{
        res.json(captureAndSaveCameraImage(currentCameras[0]));
    } catch(e) {
        res.status(400).json({ error: e.toString() });
    }
});

app.post('/delete', (req, res) => {
    const imageInfo = req.body;
    console.log(imageInfo.id)
    try {
        deleteImageByID(imageInfo.id);
        res.sendStatus(200);
    } catch (e) {
        res.status(400).json({ error: e.toString() });
    }
});

app.get('/register', async (req, res) => {
    let clientIP = req.socket.remoteAddress;
    if (clientIP == "::1") { clientIP = "127.0.0.1"; }

    setTimeout(() => { registerCamera(clientIP) }, 5000);
    res.sendStatus(200);
});


imageObjectList = loadImageObjectListFromDisk();

// Start the server
app.listen(("0.0.0.0", serverPort), () => {
    console.log(`Server listening at http://localhost:${serverPort}`);
    cameraCheckInterval();
});
