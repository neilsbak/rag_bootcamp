import React, { useState, useEffect, } from 'react';
import defaultSettings from './defaultSettings';

const SettingsContext = createContext();

const useSettings = () => useContext(SettingsContext);

const SettingsProvider = ({ children }) => {
    const storedSettings = localStorage.getItem('appSettings');
    const [settings, setSettings] = useState(storedSettings);
    
    const updateSettings = (newSettings) => {
        setSettings(newSettings);
        localStorage.setItem('appSettings', JSON.stringify(newSettings));
      };
    
    return (
        <SettingsContext.Provider value={{settings, updateSettings}}>
            {children}
        </SettingsContext.Provider>
    );
};

const Settings = ({ onClose }) => {
    const { settings, updateSettings } = useSettings();    
    const [localSettings, setLocalSettings] = useState({ defaultSettings });

    const handeLLMChange = (event) => {
        setLocalSettings({ ...localSettings, llm: event.target.value });
    };

    const handleLLMSettingChange = (llm, event) => {
        const currentLLMInfo = localSettings['llms'][llm] || {};
        const updatedLLMInfo = { ...currentLLMInfo, [event.target.name]: event.target.value };
        const updatedSettings = { ...localSettings, llms: { ...localSettings['llms'] } };
        updatedSettings.llms[llm] = updatedLLMInfo;
        setLocalSettings(updatedSettings);
    }   

    const getLLMSetting = (llm, name) => localSettings.llms[llm][name];

    useEffect(() => {
        setLocalSettings({...localSettings, ...settings});
    }, [settings]);

    const handleSave = () => {
        updateSettings(localSettings);
        onClose();
    };

    return (
        <div className="p-4 bg-white shadow-lg rounded-lg">
            <h2 className="text-lg font-semibold">Settings</h2>
            <div className="mt-4">
                <label className="block">
                    <input type="radio" name="llm" value="ollama"
                        checked={localSettings['llm'] === "ollama"}
                        onChange={handeLLMChange}
                        className="form-radio" />
                    <span className="ml-2">Ollama</span>
                </label>
                <input
                    className="border p-2 rounded w-full" placeholder="Name"
                    type="text"
                    name="baseUrl"
                    value={getLLMSetting('ollama', 'baseUrl')}
                    onChange={(e) => { handleLLMSettingChange('ollama', e) }}
                />
                <input
                    className="border p-2 rounded w-full" placeholder="Name"
                    type="text"
                    name="modelName"
                    value={getLLMSetting('ollama', 'modelName')}
                    onChange={(e) => { handleLLMSettingChange('ollama', e) }}
                />
            </div>

            <div className="flex justify-end space-x-4 mt-4">
                <button onClick={handleSave} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                    Save
                </button>
                <button onClick={onClose} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default Settings;
export { SettingsProvider, SettingsContext, useSettings };