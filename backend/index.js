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

const timeLapseConfiguration = {
    dailyStartHour: parseInt(process.env.CAM_START || 10),
    dailyEndHour: parseInt(process.env.CAM_END || 18),
    picturesPerDay: parseInt(process.env.CAM_MAX_PICS || 3),
    pictureIntervalHours: parseInt(process.env.CAM_HOURS || 2),
    checkIntervalMS: parseInt((process.env.CAM_INTERVAL || 15) * 60 * 1000),
    contourThreshold: parseInt(process.env.CAM_THRESHOLD || 50)
}
const timeLapseState = {
    nextPictureHour: -1,
    currentPictureCount: 0,
    lastDate: new Date(),
    startNewDay:false,
    nextInterval: 0
}

function isInRange(value, start, end) {
    return (value >= start) && (value < end);
}

function updateTimeInterval(lastInterval, intervalSpan) {
    const currentInterval = Date.now()
    if (lastInterval == 0) {
        lastInterval = currentInterval;
    }
    timeLapseState.nextInterval = (lastInterval + intervalSpan);
    return timeLapseState.nextInterval - currentInterval;
}

function checkAndUpdateDayChange() {
    const currentDate = new Date();
    timeLapseState.startNewDay = false;
    if (currentDate.getDate() != timeLapseState.lastDate.getDate()) {
        timeLapseState.currentPictureCount = 0;
        timeLapseState.nextPictureHour = -1;
        timeLapseState.startNewDay = true;
    }
    timeLapseState.lastDate = currentDate;
}

async function processCamera() {
    const currentDate = new Date();
    const shouldTakePicture = (currentDate.getHours() >= timeLapseState.nextPictureHour) &&
    (timeLapseState.currentPictureCount < timeLapseConfiguration.picturesPerDay);
    console.log(timeLapseState);
    try {
        //Only update the background if an object is not detected
        if (!(await isObjectDetected(currentCameras[0]))) {
            console.log("Updating");
            await updateCameraBackground(currentCameras[0]);
            return false;
        } else if (shouldTakePicture) { //Only take a picture if we are allowed
            console.log("Capturing");
            await captureAndSaveCameraImage(currentCameras[0]);
            timeLapseState.currentPictureCount += 1;
            timeLapseState.nextPictureHour = currentDate.getHours() + timeLapseConfiguration.pictureIntervalHours;
            return true;
        }
    } catch (e) {
        console.log(e);
    }
}

async function cameraCheckInterval() {

    setTimeout(cameraCheckInterval,
        updateTimeInterval(timeLapseState.nextInterval,
            timeLapseConfiguration.checkIntervalMS));

    if (!isInRange(
        (new Date()).getHours(),
        timeLapseConfiguration.dailyStartHour,
        timeLapseConfiguration.dailyEndHour
    )) {
        return;
    }

    checkAndUpdateDayChange();
    console.log("Processing");
    processCamera();
}

function loadImageObjectListFromDisk() {
    try {
        return JSON.parse(fs.readFileSync(imageStoreFilePath).toString());;
    } catch (e) {
        return [];
    }
}

function saveImageObjectListToDisk() {
    fs.writeFile(imageStoreFilePath, JSON.stringify(imageObjectList), (error) => {
        if (error) { console.log(error); }
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

async function fetchCamera(camera, route) {
    const camRes = await fetchWrap(`http://${camera.ip}:${cameraPort}/${route}`);
    if ((!camRes && camRes.ok)) { throw `could not ${route}`; }
    return camRes;
}

async function getCameraImage(camera) {
    const camRes = await fetchCamera(camera, "get_photo");
    return await camRes.arrayBuffer();
}

async function isObjectDetected(camera) {
    const camRes = await fetchCamera(camera, "is_object_detected");
    const responseObject = await camRes.json();
    return responseObject.detected > timeLapseConfiguration.contourThreshold;
}

async function updateCameraBackground(camera) {
    const camRes = await fetchCamera(camera, "update_background_image");
    return true;
}

async function setCameraBackground(camera) {
    const camRes = await fetchCamera(camera, "set_background_image");
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
        if (error) { console.log(error); }
    });
    return imageObject;
}

async function captureAndSaveCameraImage(camera) {
    const buffer = await getCameraImage(camera);
    const imageObject = saveCameraImage(buffer);
    saveImageObjectListToDisk();
    return imageObject;
}

function deleteImageByID(id) {
    const index = findImageIndexByID(id);
    const oldImages = imageObjectList.splice(index, 1);
    const fileName = `${oldImages[0].time}.jpg`;
    const filePath = path.join(imageStorePath, fileName);
    console.log(`Deleting ${filePath}`);
    // Old NodeJS doesn't have rm
    fs.unlink(filePath, (error) => {
        if (error) { console.log(error); }
    })
}

function findCamera(cameraIP) {
    return currentCameras.find(cameraData => cameraData.ip == cameraIP);
}

async function updateCameraStatus(camera) {
    try {
        const camRes = await fetchCamera(camera, "status");
        camera.status = (await camRes.json()).status;
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
    try {
        res.json(await captureAndSaveCameraImage(currentCameras[0]));
    } catch (e) {
        res.status(400).json({ error: e.toString() });
    }
});

app.get('/reset_background', async (req, res) => {
    if (currentCameras.length == 0) {
        res.status(404).send("No cameras");
        return;
    }
    try {
        res.json({status:await setCameraBackground(currentCameras[0])});
    } catch (e) {
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
    lastInterval = Date.now();
    cameraCheckInterval();
});
