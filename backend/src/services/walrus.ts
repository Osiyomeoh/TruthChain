interface WalrusStoreResponse {
    newlyCreated?: {
      blobObject: {
        id: string;
        registeredEpoch: number;
        blobId: string;
        size: number;
        encodingType: string;
        certifiedEpoch: number | null;
        storage: {
          id: string;
          startEpoch: number;
          endEpoch: number;
          storageSize: number;
        };
        deletable: boolean;
      };
      resourceOperation: any;
      cost: number;
    };
    alreadyCertified?: {
      blobId: string;
      event: {
        txDigest: string;
        eventSeq: string;
      };
      endEpoch: number;
    };
  }
  
  export async function uploadToWalrus(data: {
    hash: string;
    metadata: any;
  }): Promise<{ blobId: string; url: string }> {
    try {
      if (!process.env.WALRUS_PUBLISHER_URL || !process.env.WALRUS_AGGREGATOR_URL) {
        throw new Error('Walrus service not configured');
      }
  
      const package_data = {
        hash: data.hash,
        metadata: data.metadata,
      };
      
      const jsonString = JSON.stringify(package_data);
  
      // CORRECT endpoint according to docs: /v1/blobs with epochs parameter
      const url = `${process.env.WALRUS_PUBLISHER_URL}/v1/blobs?epochs=5`;
      
      console.log(`📤 Uploading to Walrus: ${url}`);
      
      const response = await fetch(url, {
        method: 'PUT',
        body: jsonString,
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });
  
      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        console.error(`❌ Walrus upload failed: ${response.status} ${errorText}`);
        throw new Error(`Walrus upload failed: ${response.status} ${errorText}`);
      }
  
      const result = await response.json() as WalrusStoreResponse;
      console.log('✅ Walrus response:', JSON.stringify(result, null, 2));
  
      const blobId = result.newlyCreated?.blobObject?.blobId || 
                     result.alreadyCertified?.blobId;
  
      if (!blobId) {
        throw new Error('No blob ID in Walrus response');
      }
  
      console.log(`✅ Stored on Walrus with blob ID: ${blobId}`);
  
      return {
        blobId,
        url: `${process.env.WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`
      };
  
    } catch (error) {
      console.error('❌ Walrus upload error:', error);
      throw error;
    }
  }
  
  export async function retrieveFromWalrus(blobId: string): Promise<any> {
    try {
      if (!process.env.WALRUS_AGGREGATOR_URL) {
        throw new Error('Walrus service not configured');
      }
  
      // CORRECT endpoint: /v1/blobs/{blobId}
      const url = `${process.env.WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`;
      console.log(`📥 Retrieving from Walrus: ${url}`);
      
      const response = await fetch(url);
  
      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Walrus retrieval failed: ${response.status} ${errorText}`);
      }
  
      const data = await response.text();
      
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
  
    } catch (error) {
      console.error('❌ Walrus retrieval error:', error);
      throw error;
    }
  }