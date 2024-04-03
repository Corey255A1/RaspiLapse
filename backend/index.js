// WunderVision 2024
// https://www.wundervisionengineering.com/

const express = require('express');

const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const serverPort = process.env.RASPI_SRV_PORT || 8989;
const cameraPort = process.env.RASPI_CAM_PORT || 7070;
const imageStorePath = process.env.RASPI_STORE || "/mnt/d/Documents/Time_Lapse";
const currentCameras = [{ip:"192.168.1.106", status:"good"}];
const testFile = "base_test.jpg";

Date.prototype.getFileFormat = () => {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth()+1).toString().padStart(2, '0');
    const day = now.getDay().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const second = now.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day}-${hour}${minute}${second}`;
}




const allPhotos = [
    { url: 'http://192.168.1.125:1515/2024-04-01-120000.jpg', time: '2024-04-01-120000' },
    { url: 'http://192.168.1.125:1515/2024-03-31-160000.jpg', time: '2024-03-31-160000' },
    { url: 'http://192.168.1.125:1515/2024-03-31-120000.jpg', time: '2024-03-31-120000' }
];

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

async function getCameraImage(camera) {
    const camRes = await fetch(`http://${camera.ip}:${cameraPort}/get_photo`);
    if ((!camRes && camRes.ok)) { throw "could not get image"; }
    return await camRes.arrayBuffer();
}

function saveCameraImage(filePath, arrayBuffer){
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
}

app.get('/capture', async (req, res) => {
    if(currentCameras.length == 0) { 
        res.status(404).send("No cameras");
        return; 
    }
    const buffer = await getCameraImage(currentCameras[0]);
    const now = new Date();
    const timeString = now.getFileFormat();
    const fileName = `${timeString}.jpg`;
    const newFile = path.join(imageStorePath, fileName);
    
    saveCameraImage(newFile, buffer);
    const imageObject = { url: `http://192.168.1.125:1515/${fileName}`, time: timeString }
    allPhotos.unshift(imageObject);
    res.json(imageObject);
});

app.post('/delete', (req, res) => {
    const image_info = req.body;
    console.log(image_info.id)
    try {
        const index = findPhotoIndexByID(image_info.id);
        allPhotos.splice(index, 1);
        res.sendStatus(200);
    } catch (e) {
        res.status(400).json({ error: e });
    }
});

function findCamera(cameraIP) {
    return currentCameras.find(cameraData => cameraData.ip == cameraIP);
}

async function updateCameraStatus(camera) {
    try {
        const camRes = await fetch(`http://${camera.ip}:${cameraPort}/status`);
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

app.get('/register', async (req, res) => {
    let clientIP = req.socket.remoteAddress;
    if (clientIP == "::1") { clientIP = "127.0.0.1"; }

    setTimeout(() => { registerCamera(clientIP) }, 5000);
    res.sendStatus(200);
});

// Start the server
app.listen(("0.0.0.0", serverPort), () => {
    console.log(`Server listening at http://localhost:${serverPort}`);
});
