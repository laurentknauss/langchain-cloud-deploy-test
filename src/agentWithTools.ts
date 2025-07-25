



import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';

import { END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
import { ALL_TOOLS_LIST } from "./tools/tools";

import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Import the necessary modules from LangGraph and LangSmith
const initialMessages = [
  new SystemMessage("You are a helpful assistant that can answer questions and perform calculations, use the tools at your disposal to give your answers. Address and reply to the default user named 'Laurent' in plain french language  with a respectful tone with no more than 2 sentences for each   response coming from a tool.")
];









const toolNode = new ToolNode(ALL_TOOLS_LIST);

// Create the LLM model & give it access to tools
const model = new ChatOpenAI({
  model: 'gpt-4o',

  streaming: true,
}).bindTools(ALL_TOOLS_LIST);

function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1] as AIMessage;
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }

  // Otherwise, we stop (reply to the user)  using the special "__end__" node
  return  END;
}



// Define the function that calls the model
async function callModel(state: typeof MessagesAnnotation.State) {
  try {

  const response = await model.invoke(state.messages);
  // We return a list , becaise this will get added to the existing list
  return { messages: [response] };

} catch (error) {
  console.error("Error calling model:", error);

  return {
     messages: [
      new AIMessage("Sorry, I encountered an error while processing your request. Please try again later.")
    ]};
}
}







// Define a new graph
export const graph  = new StateGraph(MessagesAnnotation)

graph
  .addNode("agent", callModel)
  .addEdge(START, "agent")   // __start__  is a special name for the entrypoint
  .addNode("tools", toolNode)
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", END]) // If the model returns a tool call, we go to the tools node, otherwise we end the graph




// Finally, we compile it into a LangChain Runnable
const app = graph.compile({
  // The langgraph Studio/Cloudapi will automatically add a checkpointer to save the state of the agent
  // only un-comment below if runing locally
  checkpointer: new MemorySaver(), // This will save the state of the agent in memory
});




// This is the main function that runs the agent
// wrapping the agent in order to use it asynchronously
async function main() {

/*
  const firstState = await app.invoke(
    {    messages: [
      ...initialMessages,
      new HumanMessage("using coingecko tool , give me the actual price of eth in euros ")
    ]
  },
  { configurable: { thread_id: 'agent_with_tools' } }
);

  const firstResponse = (firstState.messages[firstState.messages.length - 1].content);

  console.log(firstResponse);
*/


  const secondState = await app.invoke(
    {    messages: [
      ...initialMessages,
      new HumanMessage(`use openweathermap tool give me the weather forecast for this coming weekend in Deauville, fr`)
    ]
  },
  { configurable: { thread_id: 'agent_with_tools' } }
);


 const secondResponse = secondState.messages[secondState.messages.length - 1].content;
  console.log(secondResponse);


/*
  const thirdState = await app.invoke({
    messages: [
      ...initialMessages,
      new HumanMessage("fetch the latest  today's news about president Trump  right now ") ]
  },
    { configurable: { thread_id: 'agent_with_tools' }  }
  );


  const thirdResponse = thirdState.messages[thirdState.messages.length - 1].content;
  console.log(thirdResponse );

*/
}



main().catch(console.error);
