let pyodide = null;  // 儲存 Pyodide 實例

/**
 * 初始化 Pyodide 環境並載入必要的套件
 * @returns {Promise<void>}
 */
async function initPyodide() {
    if (!pyodide) {
        pyodide = await loadPyodide();
        await pyodide.loadPackage(['numpy', 'scikit-learn', 'joblib']);
    } else {
        console.log("Pyodide 已初始化，無需重新加載");
    }
}

/**
 * 從指定 URL 載入二進位檔案，並以 Uint8Array 返回
 * @param {string} url - 檔案的 URL
 * @returns {Promise<Uint8Array>} 載入的二進位資料
 */
async function loadBinaryFile(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`載入檔案失敗: ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}

/**
 * 載入 SVM 模型、標準化器與標籤
 * @returns {Promise<void>}
 */
export async function load_SVM_Model() {
    await initPyodide();

    const modelName = 'numberPos';

    try {
        // 載入模型與標準化器
        const [modelData, scalerData] = await Promise.all([
            loadBinaryFile(`./models/${modelName}/svm_${modelName}_model.pkl`),
            loadBinaryFile(`./models/${modelName}/scaler_${modelName}.pkl`)
        ]);

        // 載入標籤
        const response = await fetch(`./models/${modelName}/labels.txt`);
        const labelText = await response.text();
        const labelData = labelText.split('\n').map(line => line.trim());

        // 寫入 Pyodide 虛擬檔案系統
        pyodide.FS.writeFile('/tmp/svm_model.pkl', modelData);
        pyodide.FS.writeFile('/tmp/scaler_model.pkl', scalerData);

        // 在 Pyodide 執行 Python 代碼
        const pythonCode = `
            import joblib
            import numpy as np

            model = joblib.load('/tmp/svm_model.pkl')
            scaler = joblib.load('/tmp/scaler_model.pkl')
            labels = ${JSON.stringify(labelData)}
            print("<< Models Loaded! >>")
        `;
        await pyodide.runPythonAsync(pythonCode);

    } catch (error) {
        console.error("載入模型錯誤:", error);
    }
}

/**
 * 使用 SVM 模型進行預測
 * @param {number[]} parameters - 輸入的特徵參數陣列
 * @returns {Promise<string|undefined>} 預測結果（手勢名稱）
 */
export async function predict(parameters) {
    const pythonCode = `
        import numpy as np

        parameter = np.array(${JSON.stringify(parameters)}).reshape(1, -1)
        parameter_scaled = scaler.transform(parameter)

        prediction = model.predict(parameter_scaled)
        gesture = labels[prediction[0]]
        gesture
    `;

    try {
        const result = await pyodide.runPythonAsync(pythonCode);
        return result;
    } catch (error) {
        console.error("預測時發生錯誤:", error);
    }
}
