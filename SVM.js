let pyodide = null;  // 用來存儲 Pyodide 的實例

async function initPyodide() {
    if (!pyodide) {
        pyodide = await loadPyodide();
        await pyodide.loadPackage('numpy');
        await pyodide.loadPackage('scikit-learn');
        await pyodide.loadPackage('joblib');

    } else {
        console.log("Pyodide 已初始化，無需重新加載");
    }
}

// Load a binary file from a given URL and return it as a Uint8Array
async function loadBinaryFile(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load file: ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}

export async function load_SVM_Model() {
    // 確保 Pyodide 已經加載並且初始化
    await initPyodide();

    // 定義模型名稱
    const modelName = 'numberPos';

    // 加載模型和標準化器文件
    const modelData = await loadBinaryFile(`/models/${modelName}/svm_${modelName}_model.pkl`);
    const scalerData = await loadBinaryFile(`/models/${modelName}/scaler_${modelName}.pkl`);

    // 加載標籤數據，這裡假設它是文本文件，按行分割
    const response = await fetch(`/models/${modelName}/labels.txt`);
    const labelText = await response.text();
    const labelData = labelText.split('\n').map(line => line.trim());

    // 使用 pyodide.FS 寫入文件到虛擬檔案系統
    pyodide.FS.writeFile('/tmp/svm_model.pkl', new Uint8Array(modelData));
    pyodide.FS.writeFile('/tmp/scaler_model.pkl', new Uint8Array(scalerData));

    // 構建 Python 代碼，直接使用 JavaScript 傳遞的數據
    let pythonCode = `
        import joblib
        import numpy as np

        # 從虛擬檔案系統讀取模型和標準化器
        modelPath = '/tmp/svm_model.pkl'
        scalerPath = '/tmp/scaler_model.pkl'

        # 讀取模型和標準化器
        model = joblib.load(modelPath)
        scaler = joblib.load(scalerPath)

        # 標籤
        labels = ${JSON.stringify(labelData)}
        print("-----------------Models Loaded!-----------------")
    `;

    try {
        let result = await pyodide.runPython(pythonCode);
        //console.log("Returned Labels:", result.toJs()); 
    } catch (error) {
        console.error("錯誤:", error);
    }
}

// 假设 parameters 是一个数组
export async function predict(parameters) {
    // 构建 Python 代码
    let pythonCode = `
        import numpy as np

        parameter = np.array(${JSON.stringify(parameters)}).reshape(1, -1)
        parameter_scaled = scaler.transform(parameter)

        prediction = model.predict(parameter_scaled)
        gesture = labels[prediction[0]]
        gesture
    `;

    try {
        let result = await pyodide.runPython(pythonCode);
        return (result);
    } catch (error) {
        console.error("Error during prediction:", error);
    }
}

