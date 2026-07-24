class VectorDatabase {
    constructor() {
        // Storage holds objects structure: { id: string, vector: number[] }
        this.records = [];
    }

    /**
     * Registers a new GIF embedding vector into the database memory bank.
     * @param {string} id - The unique identifier/URL of the GIF.
     * @param {number[]} vector - The 512-dimensional array from the Python network.
     */
    insert(id, vector) {
        this.records.push({ id, vector });
    }

    /**
     * Calculates the Cosine Similarity between two numerical arrays.
     * Scale spans from -1.0 (exact opposites) to 1.0 (identical vectors).
     */
    _cosineSimilarity(vecA, vecB) {
        let dotProduct = 0.0;
        let normA = 0.0;
        let normB = 0.0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Validates an incoming query vector against all memorized vectors.
     * @param {number[]} queryVector - The fingerprint of the newly evaluated GIF.
     * @param {number} threshold - Minimum similarity confidence score to classify as "known".
     */
    search(queryVector, threshold = 0.85) {
        if (this.records.length === 0) {
            return { recognized: false, message: "Database is completely empty." };
        }

        let bestMatch = null;
        let highestSimilarity = -1;

        // Linear scan through all registered vectors
        for (const record of this.records) {
            const similarity = this._cosineSimilarity(queryVector, record.vector);
            if (similarity > highestSimilarity) {
                highestSimilarity = similarity;
                bestMatch = record;
            }
        }

        // Check if the closest match crosses the validation boundary
        if (highestSimilarity >= threshold) {
            return {
                recognized: true,
                id: bestMatch.id,
                similarity: parseFloat(highestSimilarity.toFixed(4))
            };
        }

        return {
            recognized: false,
            similarity: parseFloat(highestSimilarity.toFixed(4)),
            message: "GIF similarity score falls below validation threshold."
        };
    }

    /**
     * Returns the current capacity size of the vector database superset.
     */
    get size() {
        return this.records.length;
    }
}

