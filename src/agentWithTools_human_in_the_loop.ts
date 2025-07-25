/*
import { 
  StateGraph, START , END , MessagesAnnotation, Annotation,
} from "@langchain/langgraph" ; 

import { MemorySaver } from "@langchain/langgraph-checkpoint";  
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";  
import { ChatOpenAI } from "@langchain/openai"; 
import { tool } from   "@langchain/core/tools";   
import { logEvent } from "utils.js"; 

import { z } from "zod"; 

// Extension d'annotation avec humain dans la boucle 
const HumanLoopAnnotation = Annotation.Root({
      ...MessagesAnnotation.spec,
      humanValidated: Annotation<boolean>(),
});



const initialMessages = [ 
  new SystemMessage (  
    "You are a helpful assistant that can answer questions and perform calculations, use the tools at your disposal to give your answers and reply in no more than 2 sentences . 
  ), 
]; 


// Definition des tools 
const tools = [] ; 


// Declaration du model 
const model  = new ChatOpenAI({ 
  model :"gpt-4o-mini", 
  temperature: 0.5, 
  streaming : true, 
}).bindTools(tools); 

// nodes 
async function callModel(state : typeof HumanLoopAnnotation.State) { 
  try {
    const response =  await model.invoke(state.messages);
    return { messages: [response] };
  } catch (error) {
    console.error("Error calling model:", error);
    return {
      messages: [
        new AIMessage("Sorry, I encountered an error while processing your request. Please try again later.")
      ],
    }; 
  }
  } 



async function callTools(state: typeof HumanLoopAnnotation.State) {
 // check if human authorized the execution  
  if (!state.humanValidated) {
    throw new Error("Human validation is required before calling tools.");
  } 

  // Retrieve last message of type AI and extract the tool intention
  const last = state.messages[state.messages.length - 1] as AIMessage;
  const toolCall = last.tool_calls?.[0];
  if (!toolCall)    throw new Error("No tool call found in the last message.");  
  

  const tool = tools.find(t => t.name === toolCall.name);
  if (!tool)     throw new Error(`Tool ${toolCall.name} not found.`);

  // Manually execute the designated tool 
  const result = await tool.invoke(toolCall);
  if (!result) {
    throw new Error(`Tool ${toolCall.name} did not return a result.`);
  } 
  // Returns the result 
  return { messages: result };    
  }

  function shouldContinue(state: typeof HumanLoopAnnotation.State) {
    const last = state.messages[state.messages.length - 1] as AIMessage;
    return last.tool_calls?.length ? "tools" : END;
  }


  // Graph 
  export const graph = new StateGraph(HumanLoopAnnotation); 
  graph 
   .addNode("agent", callModel)  
   .addEdge(START, "agent")  // __start__ is a special name for the entrypoint 
   .addNode("tools", callTools)  
   .addEdge("tools", "agent") 
   .addConditionalEdges("agent", shouldContinue, ["tools", END]) // If the model returns a tool call, we go to the tools node, otherwise we end the graph

   // Finally we compile it into a LLangchain runnable
   const app = graph.compile({ 
    checkpointer: new MemorySaver(),
    interruptBefore: ["tools"],
   }); 
   */