const fs = require('fs');
const path = require('path');
const { SourceMapConsumer } = require('source-map');

async function extractTypeScript() {
    const mapPath = './cloud/dist/index.js.map';
    const outputDir = './original-typescript';
    
    // 创建输出目录
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const rawSourceMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    
    await SourceMapConsumer.with(rawSourceMap, null, (consumer) => {
        const sources = consumer.sources;
        
        sources.forEach((sourcePath) => {
            const content = consumer.sourceContentFor(sourcePath, true);
            
            if (content) {
                // 清理路径 - 移除相对路径前缀
                let cleanPath = sourcePath;
                
                // 移除常见的相对路径前缀
                const prefixesToRemove = [
                    '../../', '../', './', 
                    'webpack:///', 'webpack:///./', 'webpack:///../'
                ];
                
                for (const prefix of prefixesToRemove) {
                    if (cleanPath.startsWith(prefix)) {
                        cleanPath = cleanPath.substring(prefix.length);
                    }
                }
                
                // 确保路径在输出目录内
                const fullPath = path.join(outputDir, cleanPath);
                const dir = path.dirname(fullPath);
                
                // 创建目录
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                // 写入文件
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Extracted: ${cleanPath}`);
            }
        });
        
        console.log(`\n✅ Extracted ${sources.length} TypeScript files to ${outputDir}/`);
    });
}

extractTypeScript().catch(console.error);