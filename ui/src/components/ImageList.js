import React from 'react';

/**
 * 
 * @param {Array<ImageObject>} imageUrls 
 * @returns 
 */
const ImageList = ({ imageObjects, onImageSelected }) => {
    return (
    <div className="image-list">
      {imageObjects.map((imageObject, index) => (
        <div onClick={()=>{onImageSelected(imageObject)}} className="small-image">
            <img key={index} src={imageObject.url} alt={`${index}`} />
            <div>{imageObject.time}</div>
        </div>
      ))}
    </div>
  );
};

export default ImageList;