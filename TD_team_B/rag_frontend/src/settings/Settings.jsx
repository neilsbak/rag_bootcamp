import React, { useState, useEffect, createContext, useContext } from 'react';
import defaultSettings from './defaultSettings';

const SettingsContext = createContext();

const useSettings = () => useContext(SettingsContext);

const SettingsProvider = ({ children }) => {
    const storedSettingsText = localStorage.getItem('appSettings');
    const storedSettings = (function () {
        try {
            return JSON.parse(storedSettingsText);
        } catch (error) {
            return {};
        }
    })();
    const [settings, setSettings] = useState(storedSettings);

    const updateSettings = (newSettings) => {
        setSettings(newSettings);
        localStorage.setItem('appSettings', JSON.stringify(newSettings));
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

const Settings = ({ onClose }) => {
    const { settings, updateSettings } = useSettings();
    const [localSettings, setLocalSettings] = useState({ ...defaultSettings, ...settings });
    console.log(settings);

    const getModelSetting = (model, name) => (localSettings.models[model] || {})[name];

    const handleLLMChange = (event) => {
        setLocalSettings({ ...localSettings, llm: event.target.value });
    };

    const handleSettingChange = (model, event) => {
        const updatedSettings = JSON.parse(JSON.stringify(localSettings));
        console.log(updatedSettings);
        if (!updatedSettings['models'][model]) {
            updatedSettings['models'][model] = {}; 
        }
        updatedSettings['models'][model][event.target.name] = event.target.value;
        setLocalSettings(updatedSettings);
    }

    const handleEmbeddingChange = (event) => {
        setLocalSettings({ ...localSettings, embedding: event.target.value });
    };

    const handleSave = () => {
        // clean out any unused keys that happen to be saved in settings
        for (let key in Object.keys(localSettings)) {
            if (!(key in defaultSettings)) {
                delete localSettings[key];
            }
        }
        updateSettings(localSettings);
        onClose();
    };

    return (
        <div className="flex flex-col pt-6 bg-gray-700 text-white shadow-lg rounded-lg w-1/3 h-2/3 overflow-clip">
            <div className="flex-grow w-full h-full px-8 pb-8 overflow-auto">
                <h1 className="text-xl font-semibold mb-4">Settings</h1>
                <SettingsModel
                    inputValue="ollama"
                    llmChecked={localSettings['llm'] === "ollama"}
                    embeddingChecked={localSettings['embedding'] === "ollama"}
                    onLLMChange={handleLLMChange}
                    onEmbededingChange={handleEmbeddingChange}
                    title="Ollama"
                >
                    <SettingsTextInput
                        inputName="baseUrl"
                        inputValue={getModelSetting('ollama', 'baseUrl')}
                        onChange={(e) => { handleSettingChange('ollama', e) }}
                        title="Base URL"
                    />
                    <SettingsTextInput
                        inputName="llmModel"
                        inputValue={getModelSetting('ollama', 'llmModel')}
                        onChange={(e) => { handleSettingChange('ollama', e) }}
                        title="LLM Model"
                    />
                    <SettingsTextInput
                        inputName="embeddingModel"
                        inputValue={getModelSetting('ollama', 'embeddingModel')}
                        onChange={(e) => { handleSettingChange('ollama', e) }}
                        title="Embedding Model"
                    />
                </SettingsModel>

                <SettingsModel
                    inputValue="cohere"
                    llmChecked={localSettings['llm'] === "cohere"}
                    embeddingChecked={localSettings['embedding'] === "cohere"}
                    onLLMChange={handleLLMChange}
                    onEmbededingChange={handleEmbeddingChange}
                    title="Cohere"
                >
                    <SettingsTextInput
                        inputName="apiKey"
                        type="password"
                        inputValue={getModelSetting('cohere', 'apiKey')}
                        onChange={(e) => { handleSettingChange('cohere', e) }}
                        title="API Key"
                    />
                    <SettingsTextInput
                        inputName="llmModel"
                        inputValue={getModelSetting('cohere', 'llmModel')}
                        onChange={(e) => { handleSettingChange('cohere', e) }}
                        title="LLM Model"
                    />
                    <SettingsTextInput
                        inputName="embeddingModel"
                        inputValue={getModelSetting('cohere', 'embeddingModel')}
                        onChange={(e) => { handleSettingChange('cohere', e) }}
                        title="Embedding Model"
                    />
                </SettingsModel>

            </div>

            <div className="bg-gray-800 flex justify-end space-x-4 py-4 px-8">
                <button onClick={onClose} className=" text-gray-300 py-2 px-4">
                    Cancel
                </button>
                <button onClick={handleSave} className=" bg-blue-500 hover:bg-blue-700 text-white font-semibold p-2 px-4 rounded transition duration-150">
                    Save
                </button>
            </div>
        </div>
    );
};

const SettingsModel = ({ inputValue, llmChecked, embeddingChecked, onLLMChange, onEmbededingChange, title, children }) => {
    return (
        <div className="mt-2">
            <label className="block font-medium mb-1">{title}</label>
            <div className="ml-4">
                {onLLMChange &&
                    <label className="block mb-2">
                        <input type="radio" name="llm" value={inputValue}
                            checked={llmChecked}
                            onChange={onLLMChange}
                            className="form-radio" />
                        <span className="ml-2">Use LLM Model</span>
                    </label>
                }
                {onEmbededingChange &&
                    <label className="block">
                        <input type="radio" name="embedding" value={inputValue}
                            checked={embeddingChecked}
                            onChange={onEmbededingChange}
                            className="form-radio" />
                        <span className="ml-2">Use Embedding Model</span>
                    </label>
                }
                <div className="mt-4">{children}</div>
            </div>
        </div>
    );
};

const SettingsTextInput = ({ inputName, inputValue, onChange, title, type }) => {
    return (
        <div className="pb-3">
            <div className="text-sm pb-1">{title}</div>
            <input
                className="border-gray-400 border p-2 rounded-md bg-transparent w-full"
                type={type || "text"}
                name={inputName}
                value={inputValue}
                onChange={onChange}
            />
        </div>
    );
}

export default Settings;
export { SettingsProvider, SettingsContext, useSettings };