import './App.css';
import ImageList from './components/ImageList'

const backend = "http://localhost:8080";


/**
 * @typedef {Object} ImageObject
 * @property {string} url
 * @property {string} time
 */

/**
 * @returns {ImageObject}
 */
async function get_recent_images(){
  const server = `${backend}/recent`;
  console.log(server);
  const response = await fetch(server);

  const object = await response.json();
  console.log(object);
  return object;
}
const imageList = await get_recent_images();
function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>
          WunderVision - RaspiLapse
        </h1>
        <ImageList imageObjects={imageList}/>
      </header>
    </div>
  );
}

export default App;
