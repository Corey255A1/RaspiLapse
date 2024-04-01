// WunderVision 2024
// https://www.wundervisionengineering.com/

const express = require('express');
const body_parser = require('body-parser');
const app = express();
const port = 8080;

const all_photos = [
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
    res.json(all_photos.slice(0, 10));
});

function find_photo_index_by_id(id) {
    if (id == undefined) {
        throw 'Missing "id" query parameter';
    }
    const index = all_photos.findIndex(photo => {
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
        const index = find_photo_index_by_id(id);
        const next_index = index - 1;
        if (next_index < 0) {
            throw 'No more photos';
        }
        res.json(all_photos[next_index]);
    } catch (e) {
        res.status(400).json({ error: e });
    }
});

app.get('/previous', (req, res) => {
    const id = req.query.id;
    try {
        const index = find_photo_index_by_id(id);
        const pervious_index = index + 1;
        if (pervious_index >= all_photos.length) {
            throw 'No more photos';
        }
        res.json(all_photos[pervious_index]);
    } catch (e) {
        res.status(400).json({ error: e });
    }
});


app.post('/delete', (req, res) => {
    const image_info = req.body;
    console.log(image_info.id)
    try {
        const index = find_photo_index_by_id(image_info.id);
        all_photos.splice(index, 1);
        res.status(200).send();
    } catch (e) {
        res.status(400).json({ error: e });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
