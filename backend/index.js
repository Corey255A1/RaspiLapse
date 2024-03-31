const express = require('express');
const app = express();
const port = 8080;

// Sample photo data (replace with your actual photo data)
const all_photos = [
    { url: 'http://192.168.1.125:1515/2024-04-01-120000.jpg', time: '2024-04-01-120000' },
    { url: 'http://192.168.1.125:1515/2024-03-31-160000.jpg', time: '2024-03-31-160000' },
    { url: 'http://192.168.1.125:1515/2024-03-31-120000.jpg', time: '2024-03-31-120000' }
];

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

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
