import React from 'react';

const MainImage = ({ imageObject, onCapture, onDelete, onPreviousImage, onNextImage }) => {
    return (
        <div className="main-image">
            {imageObject != null && (<div>
                <div className="slide-image">
                    <button onClick={()=>onNextImage()}>&lt;</button>
                    <div>
                        <img src={imageObject.url} alt={imageObject.time}/>                    
                    </div>
                    <button onClick={()=>onPreviousImage()}>&gt;</button>
                </div>
                <div>{imageObject.time}</div>
            </div>)}
            <div>
                <button className='green' onClick={()=>onCapture()}>Capture New</button>
                <button className='red' onClick={()=>{onDelete(imageObject.time)}}>Delete Current</button>
            </div>
        </div>
    );
};

export default MainImage;