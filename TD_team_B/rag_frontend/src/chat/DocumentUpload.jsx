import React, { useState } from 'react';

function DocumentUpload({ onUploadComplete }) {
    const [files, setFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (event) => {
        setFiles(event.target.files);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        // Create a FormData object and append the files
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        setIsUploading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_BASE_URL}/upload`, {
                method: 'POST',
                body: formData,
            });
            //let response = {ok: 1, json: () => ({fund_name: "Test Fund", fund_overview: [{"query": "What does it do?", "response": "It invests in stuff"}]})};

            // Process the response
            if (response.ok) {
                const data = await response.json();
                console.log('Upload successful:', data);
                setIsUploading(false);
                onUploadComplete(Array(files).map(f => f.name), data['fund_name'], data['fund_overview']);
            } else {
                throw new Error('Network response was not ok.');
            }
        } catch (error) {
            setIsUploading(false);
            console.error('Upload failed:', error);
            alert('Upload failed!');
        }
    };


    return (
        <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="file-upload" className="block text-sm font-medium">
                        Upload Documents
                    </label>
                    <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                    />
                </div>
                <div>
                    {isUploading ?
                        <div className="w-8 h-8 border-4 border-blue-400 border-dashed rounded-full animate-spin"></div>
                        : <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-700">
                            Submit Files
                        </button>
                    }
                </div>
            </form>

            {files.length > 0 && (
                <div className="mt-4">
                    <h3 className="text-sm font-semibold">Files to be uploaded:</h3>
                    <ul className="list-disc pl-5">
                        {Array.from(files).map((file, index) => (
                            <li key={index} className="text-sm">{file.name} - {file.size} bytes</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default DocumentUpload;
