import asyncio
import httpx
import time

URL = "http://localhost:8000/ocr/batch"
FILE_PATH = "invoice.png"
NUM_IMAGES = 10

async def blast():
    print(f"Blasting {NUM_IMAGES} copies of {FILE_PATH} against {URL}...\n")
    
    start_time = time.time()
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        # We need to construct the multipart form data for multiple files
        files = []
        # Open all files
        file_handles = [open(FILE_PATH, "rb") for _ in range(NUM_IMAGES)]
        
        try:
            for i, f in enumerate(file_handles):
                files.append(("files", (f"invoice_copy_{i}.png", f, "image/png")))
                
            response = await client.post(URL, files=files)
            
            end_time = time.time()
            total_seconds = end_time - start_time
            
            if response.status_code == 200:
                data = response.json()
                print(f"Success! Processed {data.get('batch_total')} files.")
                print(f"Total Execution Time: {total_seconds:.2f} seconds")
                print(f"Average time per document: {total_seconds / NUM_IMAGES:.2f} seconds")
            else:
                print(f"Failed! Status Code: {response.status_code}")
                print(response.text)
                
        finally:
            for f in file_handles:
                f.close()

if __name__ == "__main__":
    asyncio.run(blast())
