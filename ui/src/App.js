import { useEffect, useState } from 'react';
import './App.css';
import ImageList from './components/ImageList'
import MainImage from './components/MainImage'
const backend = "http://localhost:8080";


/**
 * @typedef {Object} ImageObject
 * @property {string} url
 * @property {string} time
 */

/**
 * @returns {ImageObject}
 */
async function get_recent_images() {
  const server = `${backend}/recent`;
  console.log(server);
  const response = await fetch(server);

  const object = await response.json();
  console.log(object);
  return object;
}

function App() {
  const [imageList, setImageList] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  useEffect(() => {
    async function update_image_list() {
      const initial = await get_recent_images();
      setImageList(initial);
      if (initial.length > 0) {
        setCurrentImage(initial[0]);
      }
    };
    update_image_list();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>
          WunderVision - RaspiLapse
        </h1>
      </header>
      <MainImage imageObject={currentImage}/>
      <ImageList imageObjects={imageList} />
    </div>
  );
}

export default App;
