import React, { useState } from 'react';

const FundOverview = ({fundName, fundOverview}) => {
    console.log(fundOverview);
    return (
        <div>
            <div className="text-xl font-bold mb-5">{fundName}</div>
            {(fundOverview || []).map(overviewItem => (
                <div>
                    <div className="font-bold mb-3">{overviewItem.query}</div>
                    <div className="ml-4 mb-6">{overviewItem.response}</div>
                </div>
            ))}
        </div>
    )
};

export default FundOverview;