# Pizzeria Agent

A conversational AI agent built with LangChain and LangGraph to help users order pizza and reserve tables.

## Features

- **Pizza Ordering**: Assists users in creating pizza orders with customization options
- **Table Reservations**: Helps users book tables at the pizzeria
- **Conversational Interface**: Natural language interaction powered by OpenAI

## Tech Stack

- TypeScript
- LangChain/LangGraph for AI orchestration
- OpenAI for language models
- Zod for schema validation

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

3. Run the application:
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## Usage

The agent can help with:
- Taking pizza orders with toppings and size preferences
- Making table reservations for specific dates and times
- Answering questions about menu items and availability

## Author

Antonio Piccolo

## License

ISC