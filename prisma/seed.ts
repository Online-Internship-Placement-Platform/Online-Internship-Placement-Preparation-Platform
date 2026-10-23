/**
 * Idempotent seed script — Issue #27
 *
 * Inserts 150 predefined questions (10 per domain per difficulty) and
 * 15 default tests (one per domain+difficulty combination) into the database.
 *
 * Re-running this script will NOT create duplicates because each question is
 * matched by its exact prompt text and each test is matched by title + domain +
 * difficulty + isDefault flag before insertion.
 *
 * Run with:
 *   npx tsx prisma/seed.ts
 *
 * Do NOT run against the production database without explicit approval.
 */

import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
  allowPublicKeyRetrieval: true,
});

const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Question data — 10 per domain per difficulty
// ---------------------------------------------------------------------------

type Domain = "WEB_DEVELOPMENT" | "AI_ML" | "CORE_CS" | "NETWORKS" | "DATABASES";
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type AnswerOption = "A" | "B" | "C" | "D";

interface QuestionSeed {
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: AnswerOption;
  domain: Domain;
  difficulty: Difficulty;
}

const questions: QuestionSeed[] = [
  // ── WEB_DEVELOPMENT / EASY ────────────────────────────────────────────────
  { domain: "WEB_DEVELOPMENT", difficulty: "EASY", prompt: "What does HTML stand for?", optionA: "HyperText Markup Language", optionB: "HighText Machine Language", optionC: "HyperText Machine Learning", optionD: "HighText Markup Language", correctOption: "A" },
  { domain: "WEB_DEVELOPMENT", difficulty: "EASY", prompt: "Which HTML tag is used to define an internal style sheet?", optionA: "<script>", optionB: "<css>", optionC: "<style>", optionD: "<link>", correctOption: "C" },
  { domain: "WEB_DEVELOPMENT", difficulty: "EASY", prompt: "Which property in CSS is used to change the text color?", optionA: "font-color", optionB: "text-color", optionC: "color", optionD: "foreground-color", correctOption: "C" },
  { domain: "WEB_DEVELOPMENT", difficulty: "EASY", prompt: "What does CSS stand for?", optionA: "Cascading Style Sheets", optionB: "Creative Style System", optionC: "Computer Style Sheets", optionD: "Colorful Style Sheets", correctOption: "A" },
  { domain: "WEB_DEVELOPMENT", difficulty: "EASY", prompt: "Which HTML attribute specifies an alternate text for an image?", optionA: "src", optionB: "title", optionC: "alt", optionD: "longdesc", correctOption: "C" },
  { domain: "WEB_DEVELOPMENT", difficulty: "EASY", prompt: "Which HTTP method is typically used to submit a form?", optionA: "GET", optionB: "POST", optionC: "PUT", optionD: "DELETE", correctOption: "B" },
  { domain: "WEB_DEVELOPMENT", difficulty: "EASY", prompt: "In JavaScript, which keyword declares a block-scoped variable?", optionA: "var", optionB: "let", optionC: "define", optionD: "set", correctOption: "B" },
  { domain: "WEB_DEVELOPMENT", difficulty: "EASY", prompt: "Which tag creates a hyperlink in HTML?", optionA: "<link>", optionB: "<href>", optionC: "<a>", optionD: "<nav>", correctOption: "C" },
  { domain: "WEB_DEVELOPMENT", difficulty: "EASY", prompt: "What value does `typeof null` return in JavaScript?", optionA: "null", optionB: "undefined", optionC: "object", optionD: "boolean", correctOption: "C" },
  { domain: "WEB_DEVELOPMENT", difficulty: "EASY", prompt: "Which CSS property controls the spacing between elements' borders and their content?", optionA: "margin", optionB: "border-spacing", optionC: "padding", optionD: "gap", correctOption: "C" },

  // ── WEB_DEVELOPMENT / MEDIUM ──────────────────────────────────────────────
  { domain: "WEB_DEVELOPMENT", difficulty: "MEDIUM", prompt: "What does the CSS `position: sticky` value do?", optionA: "Fixes the element relative to the viewport", optionB: "Positions the element relative to its nearest positioned ancestor, switching to fixed when a scroll threshold is reached", optionC: "Removes the element from the document flow", optionD: "Stacks the element above floated siblings", correctOption: "B" },
  { domain: "WEB_DEVELOPMENT", difficulty: "MEDIUM", prompt: "In the React rendering model, what triggers a component re-render?", optionA: "Calling any function inside the component", optionB: "A state or prop change", optionC: "Accessing the DOM directly", optionD: "Importing a module", correctOption: "B" },
  { domain: "WEB_DEVELOPMENT", difficulty: "MEDIUM", prompt: "Which HTTP status code indicates that a resource was permanently moved?", optionA: "301", optionB: "302", optionC: "304", optionD: "307", correctOption: "A" },
  { domain: "WEB_DEVELOPMENT", difficulty: "MEDIUM", prompt: "What is the purpose of the `defer` attribute on a `<script>` tag?", optionA: "Loads the script before the HTML is parsed", optionB: "Loads the script asynchronously and executes it after the document has been parsed", optionC: "Prevents the script from executing", optionD: "Delays the script by one second", correctOption: "B" },
  { domain: "WEB_DEVELOPMENT", difficulty: "MEDIUM", prompt: "Which JavaScript array method creates a new array by applying a function to every element?", optionA: "forEach", optionB: "filter", optionC: "map", optionD: "reduce", correctOption: "C" },
  { domain: "WEB_DEVELOPMENT", difficulty: "MEDIUM", prompt: "What does the `box-sizing: border-box` CSS rule do?", optionA: "Adds a border inside the padding area", optionB: "Includes padding and border in the element's total width and height", optionC: "Disables the default margin", optionD: "Forces the element to be a block", correctOption: "B" },
  { domain: "WEB_DEVELOPMENT", difficulty: "MEDIUM", prompt: "What is a closure in JavaScript?", optionA: "A function that returns another function and loses its outer scope", optionB: "A function that retains access to variables from its enclosing scope after that scope has closed", optionC: "An immediately invoked function expression", optionD: "A method that closes the browser window", correctOption: "B" },
  { domain: "WEB_DEVELOPMENT", difficulty: "MEDIUM", prompt: "In REST, which HTTP method is idempotent but not safe?", optionA: "GET", optionB: "POST", optionC: "PUT", optionD: "PATCH", correctOption: "C" },
  { domain: "WEB_DEVELOPMENT", difficulty: "MEDIUM", prompt: "What is the default value of the CSS `position` property?", optionA: "absolute", optionB: "fixed", optionC: "relative", optionD: "static", correctOption: "D" },
  { domain: "WEB_DEVELOPMENT", difficulty: "MEDIUM", prompt: "Which hook in React allows you to perform side effects in a functional component?", optionA: "useState", optionB: "useRef", optionC: "useEffect", optionD: "useContext", correctOption: "C" },

  // ── WEB_DEVELOPMENT / HARD ────────────────────────────────────────────────
  { domain: "WEB_DEVELOPMENT", difficulty: "HARD", prompt: "In a browser's event loop, what is the difference between a microtask and a macrotask?", optionA: "Microtasks run after every macrotask; macrotasks include setTimeout callbacks", optionB: "Macrotasks always run before microtasks in each tick", optionC: "Microtasks are run synchronously, macrotasks asynchronously", optionD: "There is no functional difference; the terms are interchangeable", correctOption: "A" },
  { domain: "WEB_DEVELOPMENT", difficulty: "HARD", prompt: "What is the critical rendering path?", optionA: "The sequence of steps the browser takes to parse HTML, construct the DOM and CSSOM, and paint pixels", optionB: "The fastest network route between client and server", optionC: "The order in which JavaScript modules are imported", optionD: "The sequence of React lifecycle methods", correctOption: "A" },
  { domain: "WEB_DEVELOPMENT", difficulty: "HARD", prompt: "Which HTTP/2 feature allows the server to push resources to the client before they are explicitly requested?", optionA: "Multiplexing", optionB: "Header compression", optionC: "Server push", optionD: "Stream prioritization", correctOption: "C" },
  { domain: "WEB_DEVELOPMENT", difficulty: "HARD", prompt: "What is the purpose of Content Security Policy (CSP)?", optionA: "To compress response bodies", optionB: "To restrict the sources from which the browser is allowed to load resources, mitigating XSS", optionC: "To enforce HTTPS on all connections", optionD: "To limit the size of cookies", correctOption: "B" },
  { domain: "WEB_DEVELOPMENT", difficulty: "HARD", prompt: "What does CORS preflight do?", optionA: "Sends an OPTIONS request to verify that the server allows the actual cross-origin request", optionB: "Caches the first request to speed up subsequent ones", optionC: "Encrypts request headers before transmission", optionD: "Forwards the request through a proxy", correctOption: "A" },
  { domain: "WEB_DEVELOPMENT", difficulty: "HARD", prompt: "In React, what is the purpose of `React.memo`?", optionA: "It memoizes expensive computations inside a component", optionB: "It prevents a functional component from re-rendering when its props have not changed", optionC: "It caches server-side rendered output", optionD: "It replaces `useMemo` for class components", correctOption: "B" },
  { domain: "WEB_DEVELOPMENT", difficulty: "HARD", prompt: "What problem does the Temporal Dead Zone (TDZ) describe in JavaScript?", optionA: "Variables declared with `var` being hoisted with `undefined` value", optionB: "The period between entering a scope and the point where `let`/`const` variables are initialised, during which accessing them throws a ReferenceError", optionC: "The delay between a promise being resolved and its `.then` callback running", optionD: "Memory not being freed after a closure is garbage-collected", correctOption: "B" },
  { domain: "WEB_DEVELOPMENT", difficulty: "HARD", prompt: "What is tree-shaking in a JavaScript bundler?", optionA: "Removing unused modules and exports from the final bundle based on static analysis of import/export statements", optionB: "Reordering component renders for optimal performance", optionC: "Splitting the bundle into smaller chunks for lazy loading", optionD: "Minifying CSS by removing comment nodes from the style tree", correctOption: "A" },
  { domain: "WEB_DEVELOPMENT", difficulty: "HARD", prompt: "Which Web API allows incremental rendering of streamed HTML responses?", optionA: "WebSockets", optionB: "Server-Sent Events", optionC: "Fetch with ReadableStream", optionD: "XMLHttpRequest streaming mode", correctOption: "C" },
  { domain: "WEB_DEVELOPMENT", difficulty: "HARD", prompt: "What is the purpose of `WeakMap` over `Map` in JavaScript?", optionA: "WeakMap has better lookup performance than Map", optionB: "WeakMap keys must be primitive values", optionC: "WeakMap holds weak references to its keys, allowing them to be garbage-collected when no other references exist", optionD: "WeakMap is serializable to JSON while Map is not", correctOption: "C" },

  // ── AI_ML / EASY ─────────────────────────────────────────────────────────
  { domain: "AI_ML", difficulty: "EASY", prompt: "What does 'ML' stand for in AI/ML?", optionA: "Machine Logic", optionB: "Machine Learning", optionC: "Model Learning", optionD: "Mathematical Logic", correctOption: "B" },
  { domain: "AI_ML", difficulty: "EASY", prompt: "Which of the following is a supervised learning algorithm?", optionA: "K-means clustering", optionB: "DBSCAN", optionC: "Linear regression", optionD: "Principal component analysis", correctOption: "C" },
  { domain: "AI_ML", difficulty: "EASY", prompt: "What is a training dataset used for?", optionA: "Evaluating the final model performance", optionB: "Teaching the model by adjusting its parameters", optionC: "Tuning hyperparameters", optionD: "Storing model weights after training", correctOption: "B" },
  { domain: "AI_ML", difficulty: "EASY", prompt: "What type of task is image classification?", optionA: "Regression", optionB: "Clustering", optionC: "Classification", optionD: "Dimensionality reduction", correctOption: "C" },
  { domain: "AI_ML", difficulty: "EASY", prompt: "Which activation function outputs values between 0 and 1?", optionA: "ReLU", optionB: "Tanh", optionC: "Sigmoid", optionD: "Softmax", correctOption: "C" },
  { domain: "AI_ML", difficulty: "EASY", prompt: "What does overfitting mean in machine learning?", optionA: "The model performs poorly on training data", optionB: "The model learns noise in training data and performs poorly on unseen data", optionC: "The model is too simple to capture patterns", optionD: "The model takes too long to train", correctOption: "B" },
  { domain: "AI_ML", difficulty: "EASY", prompt: "What is the purpose of a validation set?", optionA: "To train the model initially", optionB: "To test the final model before deployment", optionC: "To tune hyperparameters and detect overfitting during training", optionD: "To store labelled data permanently", correctOption: "C" },
  { domain: "AI_ML", difficulty: "EASY", prompt: "Which of these is an example of unsupervised learning?", optionA: "Predicting house prices", optionB: "Spam email classification", optionC: "Customer segmentation using K-means", optionD: "Sentiment analysis", correctOption: "C" },
  { domain: "AI_ML", difficulty: "EASY", prompt: "What does a neural network's hidden layer do?", optionA: "Receives raw input data", optionB: "Produces the final output predictions", optionC: "Learns intermediate feature representations", optionD: "Stores training labels", correctOption: "C" },
  { domain: "AI_ML", difficulty: "EASY", prompt: "Which metric is most appropriate for evaluating a binary classification model on a balanced dataset?", optionA: "Mean squared error", optionB: "Accuracy", optionC: "R-squared", optionD: "Mean absolute error", correctOption: "B" },

  // ── AI_ML / MEDIUM ────────────────────────────────────────────────────────
  { domain: "AI_ML", difficulty: "MEDIUM", prompt: "What is backpropagation used for in neural networks?", optionA: "Generating predictions on new data", optionB: "Computing gradients of the loss with respect to weights to update them during training", optionC: "Initialising the weights before training", optionD: "Regularising the network to prevent overfitting", correctOption: "B" },
  { domain: "AI_ML", difficulty: "MEDIUM", prompt: "What is the vanishing gradient problem?", optionA: "Gradients become very large, causing unstable training", optionB: "Gradients become very small as they propagate backwards, making early layers learn slowly", optionC: "The model fails to converge because the learning rate is too high", optionD: "Weights are initialised to zero and stay unchanged", correctOption: "B" },
  { domain: "AI_ML", difficulty: "MEDIUM", prompt: "What does the term 'epoch' mean in model training?", optionA: "A single forward pass through one sample", optionB: "One complete pass through the entire training dataset", optionC: "The time taken to update weights once", optionD: "The number of layers in the network", correctOption: "B" },
  { domain: "AI_ML", difficulty: "MEDIUM", prompt: "What is dropout regularisation?", optionA: "Randomly setting a subset of neuron activations to zero during training to reduce overfitting", optionB: "Removing neurons from the network permanently after training", optionC: "Reducing the learning rate when accuracy plateaus", optionD: "Adding noise to the input data", correctOption: "A" },
  { domain: "AI_ML", difficulty: "MEDIUM", prompt: "Which algorithm is used to train a Support Vector Machine?", optionA: "Gradient descent on a cross-entropy loss", optionB: "Quadratic programming to maximise the margin", optionC: "Expectation maximisation", optionD: "Bellman equations", correctOption: "B" },
  { domain: "AI_ML", difficulty: "MEDIUM", prompt: "What is the purpose of the softmax function in the output layer of a multi-class classifier?", optionA: "To normalise outputs into a probability distribution over classes", optionB: "To clip outputs between -1 and 1", optionC: "To apply element-wise non-linearity", optionD: "To compute the dot product of the last hidden layer", correctOption: "A" },
  { domain: "AI_ML", difficulty: "MEDIUM", prompt: "What does the learning rate control in gradient descent?", optionA: "The number of training epochs", optionB: "The fraction of the dataset used in each update", optionC: "The step size for weight updates in each iteration", optionD: "The proportion of neurons to drop", correctOption: "C" },
  { domain: "AI_ML", difficulty: "MEDIUM", prompt: "What is a confusion matrix used for?", optionA: "Visualising training loss over time", optionB: "Evaluating the performance of a classification model by showing true vs predicted labels", optionC: "Plotting the decision boundary of a classifier", optionD: "Measuring the correlation between features", correctOption: "B" },
  { domain: "AI_ML", difficulty: "MEDIUM", prompt: "What is the key idea behind ensemble learning?", optionA: "Using a single very deep model to capture all patterns", optionB: "Combining multiple models to produce better predictions than any individual model", optionC: "Training on multiple datasets simultaneously", optionD: "Applying transfer learning from pre-trained models", correctOption: "B" },
  { domain: "AI_ML", difficulty: "MEDIUM", prompt: "In k-fold cross-validation, what is the role of each fold?", optionA: "Each fold serves as the test set once while the remaining folds are used for training", optionB: "All folds are used for training simultaneously", optionC: "The first fold trains and the rest test", optionD: "Each fold is used to tune hyperparameters independently", correctOption: "A" },

  // ── AI_ML / HARD ─────────────────────────────────────────────────────────
  { domain: "AI_ML", difficulty: "HARD", prompt: "What is the attention mechanism in transformers?", optionA: "A gating mechanism that selects relevant memory from an LSTM state", optionB: "A mechanism that computes a weighted sum of value vectors using compatibility scores between queries and keys", optionC: "A regularisation technique that focuses training on hard examples", optionD: "A positional encoding scheme for sequential data", correctOption: "B" },
  { domain: "AI_ML", difficulty: "HARD", prompt: "What distinguishes a generative model from a discriminative model?", optionA: "Generative models learn the joint distribution P(X, Y); discriminative models learn the conditional P(Y|X)", optionB: "Generative models are always unsupervised; discriminative models are supervised", optionC: "Generative models use gradient descent; discriminative models use quadratic programming", optionD: "Generative models only work with image data", correctOption: "A" },
  { domain: "AI_ML", difficulty: "HARD", prompt: "What is the role of the KL divergence term in a variational autoencoder (VAE) loss?", optionA: "It measures reconstruction accuracy", optionB: "It regularises the latent space by penalising deviation of the encoded distribution from a prior", optionC: "It computes the discriminator loss in adversarial training", optionD: "It scales the learning rate based on gradient magnitude", correctOption: "B" },
  { domain: "AI_ML", difficulty: "HARD", prompt: "What is the bias-variance trade-off in machine learning?", optionA: "High-bias models underfit; high-variance models overfit; the goal is to find the right balance", optionB: "Bias is always bad and variance is always good", optionC: "High variance reduces training time; high bias reduces inference time", optionD: "Bias and variance are independent and do not affect each other", correctOption: "A" },
  { domain: "AI_ML", difficulty: "HARD", prompt: "What does Batch Normalisation do during training?", optionA: "It normalises inputs across the entire dataset once before training", optionB: "It standardises the activations within a mini-batch and learns scale and shift parameters", optionC: "It clips the gradients to a fixed range", optionD: "It shuffles the training data before each epoch", correctOption: "B" },
  { domain: "AI_ML", difficulty: "HARD", prompt: "What is the curse of dimensionality?", optionA: "The exponential increase in data needed to maintain the same sample density as the number of features grows", optionB: "The difficulty of training deep networks due to vanishing gradients", optionC: "The inability of linear models to separate high-dimensional data", optionD: "The computational cost of matrix operations in large neural networks", correctOption: "A" },
  { domain: "AI_ML", difficulty: "HARD", prompt: "How does REINFORCE differ from supervised learning in training a policy?", optionA: "REINFORCE uses labelled examples; supervised learning uses reward signals", optionB: "REINFORCE updates the policy using the gradient of expected cumulative reward estimated from sampled trajectories", optionC: "REINFORCE is a model-based method; supervised learning is model-free", optionD: "REINFORCE requires a differentiable environment; supervised learning does not", correctOption: "B" },
  { domain: "AI_ML", difficulty: "HARD", prompt: "What does 'transfer learning' involve?", optionA: "Moving model weights between different hardware accelerators", optionB: "Taking a model pre-trained on a large dataset and fine-tuning it on a smaller related task", optionC: "Sharing training data between two organisations", optionD: "Compressing a large model into a smaller one with similar accuracy", correctOption: "B" },
  { domain: "AI_ML", difficulty: "HARD", prompt: "In a GAN, what is the Nash equilibrium condition?", optionA: "The generator produces images with zero loss", optionB: "The discriminator outputs 0.5 for all inputs, indicating it cannot distinguish real from generated samples", optionC: "The discriminator loss equals the generator loss", optionD: "The generator converges to mode collapse", correctOption: "B" },
  { domain: "AI_ML", difficulty: "HARD", prompt: "What is gradient clipping used for in deep learning?", optionA: "Preventing activations from growing beyond a threshold", optionB: "Preventing exploding gradients by rescaling the gradient vector when its norm exceeds a threshold", optionC: "Removing small gradients to speed up training", optionD: "Adapting the learning rate based on gradient history", correctOption: "B" },

  // ── CORE_CS / EASY ────────────────────────────────────────────────────────
  { domain: "CORE_CS", difficulty: "EASY", prompt: "What is the time complexity of binary search on a sorted array?", optionA: "O(n)", optionB: "O(n log n)", optionC: "O(log n)", optionD: "O(1)", correctOption: "C" },
  { domain: "CORE_CS", difficulty: "EASY", prompt: "Which data structure follows the LIFO principle?", optionA: "Queue", optionB: "Stack", optionC: "Linked list", optionD: "Tree", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "EASY", prompt: "What does CPU stand for?", optionA: "Core Processing Unit", optionB: "Central Program Utility", optionC: "Central Processing Unit", optionD: "Computer Processing Unit", correctOption: "C" },
  { domain: "CORE_CS", difficulty: "EASY", prompt: "In a binary tree, what is the maximum number of children a node can have?", optionA: "1", optionB: "2", optionC: "3", optionD: "Unlimited", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "EASY", prompt: "Which sorting algorithm has the best average-case time complexity?", optionA: "Bubble sort", optionB: "Insertion sort", optionC: "Merge sort", optionD: "Selection sort", correctOption: "C" },
  { domain: "CORE_CS", difficulty: "EASY", prompt: "What is an operating system?", optionA: "A programming language", optionB: "Software that manages hardware resources and provides services for applications", optionC: "A type of database", optionD: "A web browser", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "EASY", prompt: "What does RAM stand for?", optionA: "Read-Access Memory", optionB: "Random-Access Memory", optionC: "Rapid-Access Module", optionD: "Read-All Memory", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "EASY", prompt: "Which data structure is used to implement a breadth-first search?", optionA: "Stack", optionB: "Priority queue", optionC: "Queue", optionD: "Hash table", correctOption: "C" },
  { domain: "CORE_CS", difficulty: "EASY", prompt: "What is a compiler?", optionA: "A program that translates source code into machine code", optionB: "A program that executes code line by line", optionC: "A tool for managing memory", optionD: "A hardware component that speeds up processing", correctOption: "A" },
  { domain: "CORE_CS", difficulty: "EASY", prompt: "What is the purpose of a hash function?", optionA: "To sort data alphabetically", optionB: "To encrypt data for secure transmission", optionC: "To map data of arbitrary size to fixed-size values", optionD: "To compress data for storage", correctOption: "C" },

  // ── CORE_CS / MEDIUM ──────────────────────────────────────────────────────
  { domain: "CORE_CS", difficulty: "MEDIUM", prompt: "What is the difference between a process and a thread?", optionA: "A process is a single instruction; a thread is a full program", optionB: "A process is an independent program in execution with its own memory space; threads share the memory space of their parent process", optionC: "There is no difference; the terms are interchangeable", optionD: "Threads are managed by hardware; processes are managed by software", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "MEDIUM", prompt: "What is deadlock in operating systems?", optionA: "A process consuming 100% CPU indefinitely", optionB: "A situation where two or more processes are each waiting for a resource held by the other, causing all of them to block forever", optionC: "A memory leak that prevents new allocations", optionD: "A race condition in multi-threaded code", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "MEDIUM", prompt: "What is dynamic programming?", optionA: "Writing programs that change their logic at runtime", optionB: "A technique that solves complex problems by breaking them into overlapping subproblems and caching results to avoid redundant computation", optionC: "Allocating memory at runtime instead of compile time", optionD: "A type of polymorphism in object-oriented languages", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "MEDIUM", prompt: "What is the purpose of virtual memory?", optionA: "To simulate additional CPU cores", optionB: "To allow programs to use more memory than physically available by using disk space as an extension of RAM", optionC: "To protect the operating system from user-space applications", optionD: "To store the program counter between context switches", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "MEDIUM", prompt: "In object-oriented programming, what is polymorphism?", optionA: "The ability to inherit from multiple base classes", optionB: "The ability of different objects to respond to the same interface in different ways", optionC: "Hiding the internal implementation of a class", optionD: "Creating multiple instances of the same class", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "MEDIUM", prompt: "What is amortised time complexity?", optionA: "The worst-case time for a single operation", optionB: "The average time per operation over a sequence of operations, accounting for occasional costly operations", optionC: "The time complexity when the input is sorted", optionD: "The minimum time required across all inputs", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "MEDIUM", prompt: "What is a segmentation fault?", optionA: "A compiler error due to incorrect syntax", optionB: "A runtime error caused by a program accessing memory it is not allowed to access", optionC: "A network error caused by packet loss", optionD: "An arithmetic overflow in integer operations", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "MEDIUM", prompt: "Which graph traversal algorithm can detect a cycle in a directed graph?", optionA: "BFS alone", optionB: "DFS using a recursion stack to track visited nodes in the current path", optionC: "Dijkstra's algorithm", optionD: "Topological sort cannot detect cycles", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "MEDIUM", prompt: "What is the difference between stack memory and heap memory?", optionA: "Stack is for global variables; heap is for local variables", optionB: "Stack is managed automatically (LIFO, fixed size); heap is dynamically allocated and managed by the programmer or garbage collector", optionC: "Stack is faster than heap because it uses a linked list", optionD: "Heap is always larger than stack because it includes the OS kernel memory", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "MEDIUM", prompt: "What is memoisation?", optionA: "A hardware caching technique for frequently accessed data", optionB: "Storing the results of expensive function calls and returning the cached result when the same inputs occur again", optionC: "Converting an iterative algorithm to a recursive one", optionD: "Compressing data to reduce memory usage", correctOption: "B" },

  // ── CORE_CS / HARD ────────────────────────────────────────────────────────
  { domain: "CORE_CS", difficulty: "HARD", prompt: "What does the CAP theorem state?", optionA: "A distributed system cannot guarantee Consistency, Availability, and Partition Tolerance simultaneously; it can satisfy at most two", optionB: "A system must choose between Capacity, Availability, and Performance", optionC: "Consistency and Availability can always coexist with Partition Tolerance", optionD: "The CAP theorem applies only to relational databases", correctOption: "A" },
  { domain: "CORE_CS", difficulty: "HARD", prompt: "What is the difference between NP and NP-complete problems?", optionA: "NP problems are solvable in polynomial time; NP-complete problems are not", optionB: "NP is the class of problems verifiable in polynomial time; NP-complete problems are both in NP and NP-hard (every NP problem reduces to them in polynomial time)", optionC: "NP-complete problems have polynomial solutions that have not yet been discovered", optionD: "NP and NP-complete are different names for the same class", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "HARD", prompt: "What is the difference between optimistic and pessimistic locking?", optionA: "Optimistic locking acquires a lock before reading; pessimistic locking acquires it before writing", optionB: "Optimistic locking assumes conflicts are rare and validates at commit time; pessimistic locking blocks other transactions by acquiring locks upfront", optionC: "Optimistic locking uses shared locks; pessimistic locking uses exclusive locks only", optionD: "There is no practical difference between the two strategies", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "HARD", prompt: "What is a skip list?", optionA: "A sorted linked list enhanced with multiple levels of forward pointers to allow O(log n) average search", optionB: "A list that skips duplicate elements automatically", optionC: "A stack implementation using a linked list", optionD: "A sparse array that omits null entries", correctOption: "A" },
  { domain: "CORE_CS", difficulty: "HARD", prompt: "What is the purpose of a memory barrier (fence) instruction?", optionA: "To prevent the CPU and compiler from reordering memory operations across the barrier, ensuring visibility of writes", optionB: "To allocate a contiguous block of virtual memory", optionC: "To protect kernel memory from user-space access", optionD: "To flush the TLB after a context switch", correctOption: "A" },
  { domain: "CORE_CS", difficulty: "HARD", prompt: "What is tail call optimisation?", optionA: "Replacing the last recursive call in a function with a jump to the start of the function, reusing the current stack frame and avoiding stack growth", optionB: "Inlining the last function call to avoid function call overhead", optionC: "Sorting the call graph topologically to improve cache locality", optionD: "Merging the last few instructions of a function with the caller", correctOption: "A" },
  { domain: "CORE_CS", difficulty: "HARD", prompt: "What is the purpose of a bloom filter?", optionA: "An exact membership-test data structure with O(1) lookup", optionB: "A probabilistic data structure that can definitively confirm an element is absent but may produce false positives for membership", optionC: "A balanced BST variant optimised for concurrent access", optionD: "A hashing scheme that eliminates collisions entirely", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "HARD", prompt: "In the context of CPU architecture, what is out-of-order execution?", optionA: "Executing instructions in the order they appear in the program without pipelining", optionB: "Executing instructions in an order determined by data availability rather than program order, improving utilisation of execution units", optionC: "Speculating on branch outcomes and rolling back on misprediction", optionD: "Distributing instructions across multiple CPU cores", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "HARD", prompt: "What distinguishes a B-tree from a binary search tree?", optionA: "A B-tree is always perfectly balanced; a BST is never balanced", optionB: "A B-tree node can have more than two children and stores multiple keys, reducing tree height and improving disk I/O performance", optionC: "A B-tree uses hashing; a BST uses comparison", optionD: "A B-tree supports only integer keys; a BST supports any comparable type", correctOption: "B" },
  { domain: "CORE_CS", difficulty: "HARD", prompt: "What is a happens-before relationship in concurrency?", optionA: "A total ordering of all instructions in a multi-threaded program", optionB: "A partial order that guarantees that if event A happens-before event B, the effects of A are visible to B", optionC: "The guarantee that one thread completes before another starts", optionD: "The priority ordering used by a thread scheduler", correctOption: "B" },

  // ── NETWORKS / EASY ───────────────────────────────────────────────────────
  { domain: "NETWORKS", difficulty: "EASY", prompt: "What does IP stand for in networking?", optionA: "Internet Protocol", optionB: "Internal Program", optionC: "Interface Port", optionD: "Information Packet", correctOption: "A" },
  { domain: "NETWORKS", difficulty: "EASY", prompt: "Which layer of the OSI model is responsible for routing packets between networks?", optionA: "Data Link layer", optionB: "Transport layer", optionC: "Network layer", optionD: "Session layer", correctOption: "C" },
  { domain: "NETWORKS", difficulty: "EASY", prompt: "What is the purpose of DNS?", optionA: "To assign IP addresses to devices automatically", optionB: "To translate domain names into IP addresses", optionC: "To encrypt data in transit", optionD: "To route packets between routers", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "EASY", prompt: "What does HTTP stand for?", optionA: "HyperText Transfer Protocol", optionB: "High Transfer Text Protocol", optionC: "HyperText Terminal Program", optionD: "Host Transfer Text Protocol", correctOption: "A" },
  { domain: "NETWORKS", difficulty: "EASY", prompt: "Which protocol is used to send emails?", optionA: "FTP", optionB: "SMTP", optionC: "SNMP", optionD: "HTTP", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "EASY", prompt: "What is a MAC address?", optionA: "A software-assigned identifier for a device on a network", optionB: "A hardware identifier permanently assigned to a network interface card", optionC: "The IP address of a router", optionD: "An address used only on wireless networks", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "EASY", prompt: "Which port does HTTPS use by default?", optionA: "80", optionB: "21", optionC: "443", optionD: "8080", correctOption: "C" },
  { domain: "NETWORKS", difficulty: "EASY", prompt: "What is the function of a router?", optionA: "To amplify the Wi-Fi signal", optionB: "To forward packets between different networks based on IP addresses", optionC: "To translate MAC addresses to IP addresses", optionD: "To store frequently accessed web pages", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "EASY", prompt: "Which transport layer protocol provides reliable, ordered delivery?", optionA: "UDP", optionB: "ICMP", optionC: "TCP", optionD: "ARP", correctOption: "C" },
  { domain: "NETWORKS", difficulty: "EASY", prompt: "What is a firewall?", optionA: "A device that boosts network speed", optionB: "A security system that monitors and controls incoming and outgoing network traffic based on rules", optionC: "A server that stores website data", optionD: "A type of network cable", correctOption: "B" },

  // ── NETWORKS / MEDIUM ─────────────────────────────────────────────────────
  { domain: "NETWORKS", difficulty: "MEDIUM", prompt: "What is the purpose of NAT (Network Address Translation)?", optionA: "To assign domain names to IP addresses", optionB: "To map private IP addresses to a public IP address, allowing multiple devices to share a single public IP", optionC: "To encrypt traffic between two networks", optionD: "To balance traffic across multiple servers", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "MEDIUM", prompt: "What is the TCP three-way handshake?", optionA: "SYN → SYN-ACK → ACK — the sequence used to establish a TCP connection", optionB: "ACK → SYN → FIN — the sequence to terminate a connection", optionC: "GET → RESPONSE → ACK — the HTTP request-response cycle", optionD: "HELLO → OFFER → REQUEST — the DHCP negotiation", correctOption: "A" },
  { domain: "NETWORKS", difficulty: "MEDIUM", prompt: "What is subnetting?", optionA: "Connecting two networks using a router", optionB: "Dividing a network into smaller sub-networks to improve performance and security", optionC: "Assigning a static IP address to a device", optionD: "Encrypting data at the network layer", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "MEDIUM", prompt: "What is the difference between TCP and UDP?", optionA: "TCP is connectionless and faster; UDP is connection-oriented and reliable", optionB: "TCP is connection-oriented, reliable, and ordered; UDP is connectionless, faster, and does not guarantee delivery", optionC: "TCP operates at Layer 2; UDP operates at Layer 3", optionD: "TCP is used only for emails; UDP is used only for video", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "MEDIUM", prompt: "What is DHCP used for?", optionA: "Translating domain names to IP addresses", optionB: "Dynamically assigning IP addresses and network configuration to devices", optionC: "Securing connections with certificates", optionD: "Routing packets across the internet", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "MEDIUM", prompt: "What is ARP (Address Resolution Protocol) used for?", optionA: "Mapping domain names to IP addresses", optionB: "Mapping IP addresses to MAC addresses on a local network", optionC: "Establishing secure connections", optionD: "Routing packets across different networks", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "MEDIUM", prompt: "What is a VLAN?", optionA: "A virtual private network that encrypts traffic", optionB: "A logical partition of a physical network that separates traffic as if the devices were on separate networks", optionC: "A wireless local area network standard", optionD: "A type of network cable connector", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "MEDIUM", prompt: "What is the purpose of ICMP?", optionA: "To transfer files between hosts", optionB: "To send error messages and operational information about network conditions (e.g., ping)", optionC: "To assign IP addresses to new devices", optionD: "To encrypt data at the network layer", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "MEDIUM", prompt: "What is bandwidth in networking?", optionA: "The latency of a network connection", optionB: "The maximum rate of data transfer across a network path", optionC: "The physical distance between two network nodes", optionD: "The number of packets lost during transmission", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "MEDIUM", prompt: "What does a load balancer do?", optionA: "Encrypts traffic between client and server", optionB: "Distributes incoming network traffic across multiple servers to ensure no single server is overwhelmed", optionC: "Monitors network performance and alerts on anomalies", optionD: "Translates private IP addresses to public ones", correctOption: "B" },

  // ── NETWORKS / HARD ───────────────────────────────────────────────────────
  { domain: "NETWORKS", difficulty: "HARD", prompt: "What is BGP and what is it used for?", optionA: "Border Gateway Protocol — used to exchange routing information between autonomous systems on the internet", optionB: "Broadcast Gateway Protocol — used to send messages to all devices on a LAN", optionC: "Binary Gateway Protocol — used to encode routing tables in binary format", optionD: "Backbone Gateway Protocol — used to manage traffic on the internet backbone", correctOption: "A" },
  { domain: "NETWORKS", difficulty: "HARD", prompt: "What is the difference between symmetric and asymmetric encryption in network security?", optionA: "Symmetric uses the same key for encryption and decryption; asymmetric uses a public key to encrypt and a private key to decrypt", optionB: "Symmetric is used only for authentication; asymmetric is used only for confidentiality", optionC: "Symmetric is slower than asymmetric for large data sets", optionD: "There is no difference; modern systems use them interchangeably", correctOption: "A" },
  { domain: "NETWORKS", difficulty: "HARD", prompt: "How does TLS ensure both confidentiality and authentication?", optionA: "Through a handshake that authenticates the server using certificates and negotiates symmetric session keys for encrypted communication", optionB: "By hashing each packet with the server's public key", optionC: "By routing all traffic through a trusted third-party proxy", optionD: "By using only symmetric keys stored in the server's TPM", correctOption: "A" },
  { domain: "NETWORKS", difficulty: "HARD", prompt: "What is a SYN flood attack?", optionA: "Sending malformed packets to crash a router", optionB: "A DoS attack that sends many SYN packets without completing the handshake, exhausting the server's half-open connection table", optionC: "Intercepting and replaying authentication tokens", optionD: "Flooding a host with ICMP echo requests", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "HARD", prompt: "What is the purpose of OSPF's designated router election?", optionA: "To determine which router forwards inter-AS traffic", optionB: "To reduce the number of adjacencies on a broadcast network by having a single router exchange LSAs with all others", optionC: "To select the router with the lowest metric for each destination", optionD: "To authenticate routers before they exchange routing tables", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "HARD", prompt: "What distinguishes a stateful firewall from a stateless packet filter?", optionA: "A stateless filter is slower because it inspects payloads; a stateful firewall only inspects headers", optionB: "A stateful firewall tracks the state of connections and allows only packets that belong to established sessions; a stateless filter evaluates each packet independently", optionC: "A stateful firewall uses hardware; a stateless filter uses software only", optionD: "There is no meaningful difference in security between the two", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "HARD", prompt: "What is MPLS used for?", optionA: "Encrypting traffic between data centres", optionB: "Forwarding packets based on short fixed-length labels rather than IP addresses, enabling efficient and predictable traffic engineering", optionC: "Providing wireless connectivity in metropolitan areas", optionD: "Assigning IP addresses in large enterprise networks", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "HARD", prompt: "What is anycast routing?", optionA: "Sending a packet to all hosts in a group simultaneously", optionB: "Routing a packet to the topologically nearest node in a group of potential receivers that share the same address", optionC: "Broadcasting a packet to every device in a subnet", optionD: "Routing a packet along multiple paths and discarding duplicates at the destination", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "HARD", prompt: "What is the purpose of TCP's slow start algorithm?", optionA: "To limit the initial connection rate to prevent the server from being overwhelmed by new clients", optionB: "To begin with a small congestion window and increase it exponentially until a loss event occurs, probing for available bandwidth", optionC: "To slow down the sender when the receiver's buffer is full", optionD: "To reduce the connection speed on lossy wireless links", correctOption: "B" },
  { domain: "NETWORKS", difficulty: "HARD", prompt: "What is the significance of the TTL (Time to Live) field in an IP packet?", optionA: "It specifies how long the packet can be cached by a DNS resolver", optionB: "It limits the number of hops a packet can traverse; each router decrements it by one and discards the packet if it reaches zero, preventing infinite loops", optionC: "It sets the timeout for the TCP connection associated with the packet", optionD: "It encodes the maximum segment size for TCP negotiation", correctOption: "B" },

  // ── DATABASES / EASY ──────────────────────────────────────────────────────
  { domain: "DATABASES", difficulty: "EASY", prompt: "What does SQL stand for?", optionA: "Structured Query Language", optionB: "Simple Query Language", optionC: "Standard Query Logic", optionD: "Sequential Query Language", correctOption: "A" },
  { domain: "DATABASES", difficulty: "EASY", prompt: "Which SQL clause is used to filter rows?", optionA: "ORDER BY", optionB: "GROUP BY", optionC: "WHERE", optionD: "HAVING", correctOption: "C" },
  { domain: "DATABASES", difficulty: "EASY", prompt: "What is a primary key?", optionA: "A key that references another table", optionB: "A column or set of columns that uniquely identifies each row in a table", optionC: "The first column in a table", optionD: "A column that cannot contain null values", correctOption: "B" },
  { domain: "DATABASES", difficulty: "EASY", prompt: "What does SELECT * FROM users return?", optionA: "The count of rows in the users table", optionB: "All columns and all rows from the users table", optionC: "The first row of the users table", optionD: "Only the primary key column", correctOption: "B" },
  { domain: "DATABASES", difficulty: "EASY", prompt: "What is a foreign key?", optionA: "A key from another database", optionB: "A column that establishes a link between rows in two tables by referencing the primary key of another table", optionC: "An encrypted primary key", optionD: "A key used to sort query results", correctOption: "B" },
  { domain: "DATABASES", difficulty: "EASY", prompt: "Which SQL statement is used to add new rows to a table?", optionA: "UPDATE", optionB: "ADD", optionC: "INSERT INTO", optionD: "CREATE", correctOption: "C" },
  { domain: "DATABASES", difficulty: "EASY", prompt: "What does the COUNT() function do in SQL?", optionA: "Returns the sum of a column", optionB: "Returns the number of rows matching the query", optionC: "Returns the highest value in a column", optionD: "Returns the average value of a column", correctOption: "B" },
  { domain: "DATABASES", difficulty: "EASY", prompt: "What is a database index used for?", optionA: "To encrypt table data", optionB: "To speed up data retrieval by providing a fast lookup path", optionC: "To restrict access to a table", optionD: "To enforce uniqueness on a column", correctOption: "B" },
  { domain: "DATABASES", difficulty: "EASY", prompt: "What does NULL represent in a database?", optionA: "Zero", optionB: "An empty string", optionC: "An unknown or missing value", optionD: "False", correctOption: "C" },
  { domain: "DATABASES", difficulty: "EASY", prompt: "Which SQL keyword removes duplicate rows from a result set?", optionA: "UNIQUE", optionB: "DISTINCT", optionC: "FILTER", optionD: "EXCEPT", correctOption: "B" },

  // ── DATABASES / MEDIUM ────────────────────────────────────────────────────
  { domain: "DATABASES", difficulty: "MEDIUM", prompt: "What is a database transaction?", optionA: "A query that retrieves data from multiple tables", optionB: "A sequence of operations treated as a single unit of work that either fully commits or fully rolls back", optionC: "A stored procedure that modifies data", optionD: "A scheduled backup of the database", correctOption: "B" },
  { domain: "DATABASES", difficulty: "MEDIUM", prompt: "What does ACID stand for in database systems?", optionA: "Availability, Consistency, Isolation, Durability", optionB: "Atomicity, Consistency, Isolation, Durability", optionC: "Atomicity, Concurrency, Integrity, Durability", optionD: "Availability, Concurrency, Isolation, Data-integrity", correctOption: "B" },
  { domain: "DATABASES", difficulty: "MEDIUM", prompt: "What is the difference between INNER JOIN and LEFT JOIN?", optionA: "INNER JOIN returns all rows from both tables; LEFT JOIN returns only matching rows", optionB: "INNER JOIN returns only rows with matches in both tables; LEFT JOIN returns all rows from the left table and matching rows from the right", optionC: "LEFT JOIN is faster than INNER JOIN for large tables", optionD: "There is no difference; they produce the same results", correctOption: "B" },
  { domain: "DATABASES", difficulty: "MEDIUM", prompt: "What is database normalisation?", optionA: "Converting all text to lowercase for consistency", optionB: "Organising tables to reduce data redundancy and improve data integrity by applying normal forms", optionC: "Compressing tables to reduce storage space", optionD: "Adding indexes to all columns", correctOption: "B" },
  { domain: "DATABASES", difficulty: "MEDIUM", prompt: "What is the purpose of the GROUP BY clause?", optionA: "To filter rows before aggregation", optionB: "To sort the result set by one or more columns", optionC: "To group rows with the same values in specified columns so that aggregate functions can be applied to each group", optionD: "To join two tables on a common column", correctOption: "C" },
  { domain: "DATABASES", difficulty: "MEDIUM", prompt: "What is a stored procedure?", optionA: "A read-only view of one or more tables", optionB: "A prepared SQL code block saved in the database that can be executed by name with optional parameters", optionC: "An automatic trigger that fires on data changes", optionD: "An index on frequently queried columns", correctOption: "B" },
  { domain: "DATABASES", difficulty: "MEDIUM", prompt: "What is the difference between DELETE and TRUNCATE in SQL?", optionA: "DELETE removes the table; TRUNCATE removes all rows from it", optionB: "DELETE removes specific rows and can be rolled back; TRUNCATE removes all rows, cannot be rolled back in most databases, and is faster", optionC: "They are identical in behaviour and performance", optionD: "TRUNCATE removes one row at a time; DELETE removes all rows at once", correctOption: "B" },
  { domain: "DATABASES", difficulty: "MEDIUM", prompt: "What is an ORM (Object-Relational Mapper)?", optionA: "A database management system for object-oriented data", optionB: "A library that maps database tables to programming language objects and abstracts SQL queries", optionC: "A query optimiser built into the database engine", optionD: "A schema migration tool", correctOption: "B" },
  { domain: "DATABASES", difficulty: "MEDIUM", prompt: "What is the purpose of the HAVING clause?", optionA: "To filter rows before they are grouped", optionB: "To filter groups produced by GROUP BY based on aggregate conditions", optionC: "To sort grouped results in descending order", optionD: "To join two grouped result sets", correctOption: "B" },
  { domain: "DATABASES", difficulty: "MEDIUM", prompt: "What is a view in a relational database?", optionA: "A physical copy of a table for performance optimisation", optionB: "A virtual table defined by a stored SELECT query, providing an abstraction layer over base tables", optionC: "A special index on computed columns", optionD: "A log of all data modifications to a table", correctOption: "B" },

  // ── DATABASES / HARD ──────────────────────────────────────────────────────
  { domain: "DATABASES", difficulty: "HARD", prompt: "What is the difference between optimistic and pessimistic concurrency control in databases?", optionA: "Optimistic locking acquires locks before reading; pessimistic locking acquires them before writing", optionB: "Optimistic control assumes conflicts are rare and validates at commit time; pessimistic control blocks other transactions upfront by acquiring locks", optionC: "Optimistic control is suitable only for read-heavy workloads; pessimistic control is for write-heavy workloads", optionD: "There is no meaningful difference between them in a single-node database", correctOption: "B" },
  { domain: "DATABASES", difficulty: "HARD", prompt: "What is a covering index?", optionA: "An index that includes all columns needed to satisfy a query, allowing the database to answer the query from the index alone without accessing the table", optionB: "An index that spans the entire table and covers all columns", optionC: "A partial index that covers only rows matching a condition", optionD: "A composite index defined on more than three columns", correctOption: "A" },
  { domain: "DATABASES", difficulty: "HARD", prompt: "What is MVCC (Multi-Version Concurrency Control)?", optionA: "A technique that keeps multiple versions of a row so that readers do not block writers and each transaction sees a consistent snapshot", optionB: "A replication strategy that maintains multiple copies of the database across regions", optionC: "A locking scheme that allows multiple writes to the same row simultaneously", optionD: "A sharding technique that distributes rows across multiple servers", correctOption: "A" },
  { domain: "DATABASES", difficulty: "HARD", prompt: "What is the difference between a clustered and a non-clustered index?", optionA: "A clustered index physically orders the table data by the index key; a non-clustered index is a separate structure with pointers to the rows", optionB: "A clustered index stores only unique values; a non-clustered index allows duplicates", optionC: "There can be many clustered indexes per table; only one non-clustered index is allowed", optionD: "Clustered indexes are created automatically; non-clustered indexes must be created manually", correctOption: "A" },
  { domain: "DATABASES", difficulty: "HARD", prompt: "What is a write-ahead log (WAL) in database systems?", optionA: "A log that records all SELECT queries for auditing", optionB: "A mechanism where changes are first written to a log before being applied to the data pages, ensuring durability and enabling crash recovery", optionC: "A transaction log replicated to a read replica for high availability", optionD: "A buffer that batches writes to improve throughput", correctOption: "B" },
  { domain: "DATABASES", difficulty: "HARD", prompt: "What is the phantom read anomaly in database transactions?", optionA: "Reading a row that has been modified by a concurrent transaction before it commits", optionB: "A transaction re-executing a query and seeing new rows that were inserted by another committed transaction, which were not visible in the first execution", optionC: "A transaction reading a row that was deleted by a concurrent transaction", optionD: "Stale data being served from a read replica due to replication lag", correctOption: "B" },
  { domain: "DATABASES", difficulty: "HARD", prompt: "What is database sharding?", optionA: "Splitting a table into separate columns across multiple databases", optionB: "Horizontally partitioning a database across multiple servers so that each server holds a subset of the rows, distributing load and storage", optionC: "Creating read replicas to offload read traffic from the primary", optionD: "Compressing infrequently accessed data to cheaper storage tiers", correctOption: "B" },
  { domain: "DATABASES", difficulty: "HARD", prompt: "What is the two-phase commit (2PC) protocol?", optionA: "A protocol with two phases: writing the WAL and then applying changes", optionB: "A distributed transaction protocol where a coordinator first asks all participants to prepare, and only if all agree does it send a final commit", optionC: "A replication protocol that commits to two replicas before acknowledging success", optionD: "A locking protocol with a growing phase and a shrinking phase", correctOption: "B" },
  { domain: "DATABASES", difficulty: "HARD", prompt: "What is eventual consistency in distributed databases?", optionA: "All nodes in a cluster are always in sync with zero replication lag", optionB: "A consistency model where, if no new updates are made, all replicas will eventually converge to the same value, but reads may return stale data in the interim", optionC: "Consistency achieved only at transaction commit boundaries", optionD: "A model that guarantees consistency but sacrifices availability", correctOption: "B" },
  { domain: "DATABASES", difficulty: "HARD", prompt: "What does the EXPLAIN statement do in SQL?", optionA: "It returns the DDL used to create a table", optionB: "It shows the query execution plan chosen by the query optimiser, including index usage, join methods, and estimated costs", optionC: "It validates a query for syntax errors without executing it", optionD: "It prints the data types of each column in the result set", correctOption: "B" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultTestTitle(domain: Domain, difficulty: Difficulty): string {
  const domainLabel: Record<Domain, string> = {
    WEB_DEVELOPMENT: "Web Development",
    AI_ML: "AI / ML",
    CORE_CS: "Core CS",
    NETWORKS: "Networks",
    DATABASES: "Databases",
  };
  const diffLabel: Record<Difficulty, string> = {
    EASY: "Easy",
    MEDIUM: "Medium",
    HARD: "Hard",
  };
  return `${domainLabel[domain]} — ${diffLabel[difficulty]} Practice Test`;
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log("Starting idempotent seed...");

  const domains: Domain[] = ["WEB_DEVELOPMENT", "AI_ML", "CORE_CS", "NETWORKS", "DATABASES"];
  const difficulties: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

  let questionsInserted = 0;
  let questionsSkipped = 0;

  // Upsert questions one at a time — match on prompt text to stay idempotent.
  for (const q of questions) {
    const existing = await prisma.question.findFirst({
      where: { prompt: q.prompt },
      select: { id: true },
    });
    if (existing) {
      questionsSkipped++;
      continue;
    }
    await prisma.question.create({ data: q });
    questionsInserted++;
  }

  console.log(`Questions: ${questionsInserted} inserted, ${questionsSkipped} already existed.`);

  // Create the 15 default tests, each referencing the 10 matching questions.
  let testsInserted = 0;
  let testsSkipped = 0;

  for (const domain of domains) {
    for (const difficulty of difficulties) {
      const title = defaultTestTitle(domain, difficulty);

      const existing = await prisma.placementTest.findFirst({
        where: { title, domain, difficulty, isDefault: true },
        select: { id: true },
      });
      if (existing) {
        testsSkipped++;
        continue;
      }

      // Fetch the 10 questions for this domain+difficulty (by insertion order).
      const domainQuestions = await prisma.question.findMany({
        where: { domain, difficulty },
        orderBy: { id: "asc" },
        take: 10,
        select: { id: true },
      });

      if (domainQuestions.length < 10) {
        console.warn(
          `Warning: only ${domainQuestions.length} questions found for ${domain}/${difficulty}. Expected 10.`
        );
      }

      await prisma.placementTest.create({
        data: {
          title,
          domain,
          difficulty,
          isDefault: true,
          isPublished: true,
          description: `Default practice test for ${domain.replace(/_/g, " ").toLowerCase()} at ${difficulty.toLowerCase()} difficulty.`,
          questions: {
            create: domainQuestions.map((q, index) => ({
              order: index + 1,
              question: { connect: { id: q.id } },
            })),
          },
        },
      });
      testsInserted++;
    }
  }

  console.log(`Default tests: ${testsInserted} inserted, ${testsSkipped} already existed.`);
  console.log("Seed complete.");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
