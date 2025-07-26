import socketio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import json

# Create a Socket.IO asynchronous server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Create a FastAPI app instance
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the Socket.IO server on the FastAPI app
sio_app = socketio.ASGIApp(sio)
app.mount('/socket.io', sio_app)

class LLMRequest(BaseModel):
    data: dict
    message: str
    apiKey: str

@app.post("/execute_llm_request")
async def execute_llm_request(request: LLMRequest):
    print("Received LLM request")
    try:
        genai.configure(api_key=request.apiKey)
        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = f"""
        You are a spreadsheet assistant. Your goal is to help users by interpreting their requests and providing structured JSON responses. The user's request will be in the 'message' field. You have access to the current spreadsheet data and a set of functions you can use to manipulate the data.

        Spreadsheet Data:
        {json.dumps(request.data, indent=2)}

        Available Functions:
        - update_cell(col, row, value): Updates the value of a specific cell.
        - remove_cell(col, row): Removes the value of a specific cell.
        - get_cell(col, row): Retrieves the value of a specific cell.
        - sum_col(col): Calculates the sum of a column.
        - avg_col(col): Calculates the average of a column.
        - count_col(col): Counts the number of non-empty cells in a column.
        - max_col(col): Finds the maximum value in a column.
        - min_col(col): Finds the minimum value in a column.
        - add_col(col): Adds a new column.
        - del_col(col): Deletes a column.
        - sum_row(row): Calculates the sum of a row.
        - avg_row(row): Calculates the average of a row.
        - count_row(row): Counts the number of non-empty cells in a row.
        - max_row(row): Finds the maximum value in a row.
        - min_row(row): Finds the minimum value in a row.
        - add_row(row): Adds a new row.
        - del_row(row): Deletes a row.
        - sum_range(startCol, startRow, endCol, endRow): Calculates the sum of a range of cells.
        - avg_range(startCol, startRow, endCol, endRow): Calculates the average of a range of cells.
        - clear_range(startCol, startRow, endCol, endRow): Clears a range of cells.
        - clear_all(): Clears the entire spreadsheet.
        - find_cell(value): Finds a cell with a specific value.
        - replace_all(oldValue, newValue): Replaces all occurrences of a value.

        User Message: "{request.message}"

        Your response must be a JSON object with two keys: 'message' and 'functions'.
        - 'message': A user-friendly message to be displayed in the chat.
        - 'functions': A list of function calls to be executed on the spreadsheet.

        Example Response:
        {{
          "message": "I have calculated the sum of column A and placed it in cell B1.",
          "functions": ["sum_col('A')", "update_cell('B', 1, 'SUM_RESULT')"]
        }}
        """
        print("Generated prompt for Gemini:\n", prompt)

        response = model.generate_content(prompt)
        print("Received response from Gemini:\n", response.text)
        
        # Clean the response to extract the JSON part
        cleaned_response_text = response.text.strip().replace('```json', '').replace('```', '').strip()
        print("Cleaned response text:\n", cleaned_response_text)
        
        response_json = json.loads(cleaned_response_text)
        print("Parsed JSON response:\n", response_json)

        if 'functions' in response_json and isinstance(response_json['functions'], list):
            print("Found functions to execute:", response_json['functions'])
            for func_call in response_json['functions']:
                print(f"Emitting command: {func_call}")
                await sio.emit('execute_command', {'command': func_call})

        return {"status": "success", "message": response_json.get("message", "")}

    except Exception as e:
        print(f"An error occurred: {e}")
        return {"status": "error", "message": str(e)}

@sio.event
def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.on('function_result')
async def handle_function_result(sid, data):
    print(f"Received result from client {sid}: {data['result']}")

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
