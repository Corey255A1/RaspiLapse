import React from 'react';

const MainImage = ({ imageObject }) => {
    if (imageObject == null) {
        return <div>No Images</div>;
    }

    return (
        <div className="main-image">
            <div className="slide-image">
                <button>&lt;</button>
                <div>
                    <img src={imageObject.url} />
                    <div>{imageObject.time}</div>
                </div>
                <button>&gt;</button>
            </div>
            <div>
                <button className='green'>Capture New</button>
                <button className='red'>Delete Current</button>
            </div>
        </div>
    );
};

export default MainImage;