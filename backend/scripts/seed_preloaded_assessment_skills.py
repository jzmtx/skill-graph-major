import os
import sys
import json
import hashlib
from dotenv import load_dotenv

# Ensure backend root is on python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import supabase

def make_fingerprint(text: str) -> str:
    cleaned = "".join(text.lower().split())
    return hashlib.sha256(cleaned.encode("utf-8")).hexdigest()[:16]

# Comprehensive Question Library for requested skills:
# python, c++, java, js, docker, html, css, c, os, dbms, sql
QUESTIONS_DATA = {
    "Python": {
        1: [
            {
                "text": "What is the primary characteristic of Python's typing system?",
                "options": ["Dynamically typed and strongly typed", "Statically typed and weakly typed", "Statically typed and strongly typed", "Dynamically typed and weakly typed"],
                "answer": "Dynamically typed and strongly typed",
                "topic": "Language Fundamentals"
            },
            {
                "text": "Which built-in Python collection type is immutable?",
                "options": ["tuple", "list", "set", "dict"],
                "answer": "tuple",
                "topic": "Data Types"
            },
            {
                "text": "What will be the output of `bool([])` in Python?",
                "options": ["False", "True", "None", "TypeError"],
                "answer": "False",
                "topic": "Truthiness"
            }
        ],
        2: [
            {
                "text": "What is the result of the expression `{x: x**2 for x in (1, 2, 3)}` in Python?",
                "options": ["{1: 1, 2: 4, 3: 9}", "[1, 4, 9]", "(1, 4, 9)", "{1, 4, 9}"],
                "answer": "{1: 1, 2: 4, 3: 9}",
                "topic": "Comprehensions"
            },
            {
                "text": "How does `list.append(x)` differ from `list.extend(x)` when `x = [4, 5]`?",
                "options": ["append adds [4, 5] as a single element; extend adds 4 and 5 individually", "extend adds [4, 5] as a single element; append adds 4 and 5 individually", "Both produce the exact same list structure", "extend creates a new list while append modifies in-place"],
                "answer": "append adds [4, 5] as a single element; extend adds 4 and 5 individually",
                "topic": "Collections"
            },
            {
                "text": "What keyword is used in Python to define a generator function?",
                "options": ["yield", "generate", "return", "next"],
                "answer": "yield",
                "topic": "Generators"
            }
        ],
        3: [
            {
                "text": "What is the purpose of the `functools.wraps` decorator when building custom decorators?",
                "options": ["Preserves the original function's name, docstring, and metadata", "Makes the decorated function thread-safe", "Compiles the decorator into C bytecode for speed", "Enforces strict type hint validation at runtime"],
                "answer": "Preserves the original function's name, docstring, and metadata",
                "topic": "Decorators"
            },
            {
                "text": "What is the time complexity of looking up a key in a standard Python dictionary with average-case hashing?",
                "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
                "answer": "O(1)",
                "topic": "Data Structure Complexity"
            },
            {
                "text": "In Python's `asyncio`, what does `await asyncio.gather(*tasks)` do?",
                "options": ["Runs multiple coroutines concurrently and returns their aggregated results", "Executes coroutines in strictly sequential order blocking each", "Spawns a new OS thread for each task", "Terminates any task that takes longer than 1 second"],
                "answer": "Runs multiple coroutines concurrently and returns their aggregated results",
                "topic": "Asyncio"
            }
        ],
        4: [
            {
                "text": "Why is using a mutable default argument like `def append_to(element, target=[])` considered a major trap in Python?",
                "options": ["The default list is instantiated once at function definition time, persisting state across invocations", "Python throws a SyntaxError when a mutable literal is in parameter defaults", "The list is garbage collected after each function call", "The argument cannot be overridden by caller"],
                "answer": "The default list is instantiated once at function definition time, persisting state across invocations",
                "topic": "Evaluation Semantics"
            },
            {
                "text": "What is the CPython Global Interpreter Lock (GIL)?",
                "options": ["A mutex that prevents multiple native threads from executing Python bytecodes concurrently in a single process", "A security sandbox preventing Python scripts from accessing OS file systems", "A lock on database transactions managed by the ORM", "A JIT optimization flag in Python 3.12"],
                "answer": "A mutex that prevents multiple native threads from executing Python bytecodes concurrently in a single process",
                "topic": "CPython Internals"
            },
            {
                "text": "What method in Python's descriptor protocol is called during attribute access when an object is retrieved from an instance?",
                "options": ["__get__(self, instance, owner)", "__getattr__(self, name)", "__fetch__(self, key)", "__access__(self, target)"],
                "answer": "__get__(self, instance, owner)",
                "topic": "Descriptors"
            }
        ],
        5: [
            {
                "text": "In Python's Metaclass lifecycle, what is the exact difference between `__new__` and `__init__` on a `type` subclass?",
                "options": ["__new__ allocates and returns the class object; __init__ initializes the already-created class object", "__init__ creates the class namespace; __new__ only populates methods", "__new__ is called on class instances; __init__ is called on metaclass definition", "There is no difference; they are interchangeable aliases"],
                "answer": "__new__ allocates and returns the class object; __init__ initializes the already-created class object",
                "topic": "Metaprogramming"
            },
            {
                "text": "In CPython's cyclic garbage collector, which objects are tracked for circular reference cycles?",
                "options": ["Container objects that can hold references to other objects (e.g., dicts, lists, custom instances)", "All primitive immutable objects like integers and strings", "Only objects explicitly decorated with @garbage_collect", "Only file pointers and sockets"],
                "answer": "Container objects that can hold references to other objects (e.g., dicts, lists, custom instances)",
                "topic": "Memory & GC"
            },
            {
                "text": "How does Python resolve method calls across complex multiple inheritance hierarchies with cooperative `super()`?",
                "options": ["C3 Linearization algorithm (Method Resolution Order - MRO)", "Depth-first search left-to-right with backtracking", "Breadth-first search", "Order of dictionary key hashing"],
                "answer": "C3 Linearization algorithm (Method Resolution Order - MRO)",
                "topic": "MRO & OOP Internals"
            }
        ]
    },

    "C++": {
        1: [
            {
                "text": "What does the `std::cout` stream represent in C++ standard I/O?",
                "options": ["Standard output stream", "Standard error stream", "Standard input stream", "File log stream"],
                "answer": "Standard output stream",
                "topic": "Basics & I/O"
            },
            {
                "text": "Which operator is used in C++ to access a member of an object through a pointer?",
                "options": ["->", ".", "::", "&"],
                "answer": "->",
                "topic": "Pointers & Syntax"
            },
            {
                "text": "What is the index of the first element in a standard C++ array or `std::vector`?",
                "options": ["0", "1", "-1", "Depends on compiler"],
                "answer": "0",
                "topic": "Arrays"
            }
        ],
        2: [
            {
                "text": "What is the primary difference between `pass-by-value` and `pass-by-reference` (`const Type&`) in C++ functions?",
                "options": ["Pass-by-value copies the argument; pass-by-reference avoids copying by passing the object's address alias", "Pass-by-reference always allocates heap memory", "Pass-by-value allows modifying the caller's variable", "Pass-by-reference cannot be used with user-defined classes"],
                "answer": "Pass-by-value copies the argument; pass-by-reference avoids copying by passing the object's address alias",
                "topic": "Functions & References"
            },
            {
                "text": "Which STL container in C++ provides contiguous memory storage and dynamic resizing?",
                "options": ["std::vector", "std::list", "std::deque", "std::set"],
                "answer": "std::vector",
                "topic": "STL Containers"
            },
            {
                "text": "What is the default access specifier for members of a `class` versus a `struct` in C++?",
                "options": ["class defaults to private; struct defaults to public", "class defaults to public; struct defaults to private", "Both default to private", "Both default to protected"],
                "answer": "class defaults to private; struct defaults to public",
                "topic": "OOP Access Specifiers"
            }
        ],
        3: [
            {
                "text": "What is the purpose of declaring a destructor `virtual` in a base class in C++?",
                "options": ["Ensures derived class destructors are called when deleting via a base pointer, preventing resource leaks", "Forces the class to be purely abstract", "Prevents derived classes from overriding the destructor", "Allocates the object in static memory"],
                "answer": "Ensures derived class destructors are called when deleting via a base pointer, preventing resource leaks",
                "topic": "Polymorphism"
            },
            {
                "text": "How does `std::unique_ptr` enforce exclusive ownership of a dynamically allocated object?",
                "options": ["Its copy constructor and copy assignment operator are deleted; only move semantics are permitted", "It uses an atomic reference counter that throws when copied", "It locks the operating system memory page", "It only allows stack allocations"],
                "answer": "Its copy constructor and copy assignment operator are deleted; only move semantics are permitted",
                "topic": "Smart Pointers"
            },
            {
                "text": "What is RAII (Resource Acquisition Is Initialization) in C++?",
                "options": ["Binding resource lifecycle (memory, file handles, mutexes) to object lifetime via constructors and destructors", "Initializing all variables to null pointers before main() executes", "A compiler flag that turns off runtime exceptions", "A template metaprogramming library"],
                "answer": "Binding resource lifecycle (memory, file handles, mutexes) to object lifetime via constructors and destructors",
                "topic": "Resource Management"
            }
        ],
        4: [
            {
                "text": "In C++11 and newer, what does `std::move` actually do at runtime?",
                "options": ["It performs an unconditional static_cast of its argument to an rvalue reference; it does not move bytes by itself", "It allocates a new heap buffer and shallow-copies pointers", "It invokes the OS copy-on-write memory mapping", "It deletes the source object immediately"],
                "answer": "It performs an unconditional static_cast of its argument to an rvalue reference; it does not move bytes by itself",
                "topic": "Move Semantics"
            },
            {
                "text": "What is the purpose of SFINAE (Substitution Failure Is Not An Error) in C++ template metaprogramming?",
                "options": ["Allows compiler overload resolution to discard template specializations that fail type substitution without failing compilation", "Allows runtime exception recovery from template type mismatches", "Replaces virtual dispatch tables with inline assembly", "Automatically converts invalid pointers to nullptr"],
                "answer": "Allows compiler overload resolution to discard template specializations that fail type substitution without failing compilation",
                "topic": "Templates & SFINAE"
            },
            {
                "text": "What is the difference between `std::atomic` operations with `memory_order_relaxed` versus `memory_order_seq_cst`?",
                "options": ["relaxed only guarantees atomicity without synchronizing memory order; seq_cst enforces globally sequential consistency across all threads", "relaxed allows data races; seq_cst is single-threaded only", "relaxed locks a mutex; seq_cst is lock-free", "seq_cst is deprecated in modern C++"],
                "answer": "relaxed only guarantees atomicity without synchronizing memory order; seq_cst enforces globally sequential consistency across all threads",
                "topic": "Concurrency & Memory Model"
            }
        ],
        5: [
            {
                "text": "In C++ memory layout, how does dynamic dispatch via the virtual method table (vtable) work under multiple inheritance with cross-casting?",
                "options": ["Each subobject has its own vptr with offset-to-top and RTTI pointers to adjust the `this` pointer across base class offsets", "The compiler creates a single global switch statement on dynamic type IDs", "All virtual functions are rewritten into function pointers on the heap", "Cross-casting causes undefined behavior without virtual inheritance"],
                "answer": "Each subobject has its own vptr with offset-to-top and RTTI pointers to adjust the `this` pointer across base class offsets",
                "topic": "ABI & Vtable Internals"
            },
            {
                "text": "What is the 'Rule of Five' (or Zero) in modern C++ and when must it be implemented?",
                "options": ["If a class manages resources and defines any of Destructor, Copy Constructor, Copy Assignment, Move Constructor, or Move Assignment, it should define all five", "Every template class must support five basic type parameters", "No function can exceed five arguments without using a tuple", "Pointers must be wrapped in five layers of smart pointers"],
                "answer": "If a class manages resources and defines any of Destructor, Copy Constructor, Copy Assignment, Move Constructor, or Move Assignment, it should define all five",
                "topic": "Class Mechanics"
            },
            {
                "text": "How do C++20 Concepts improve template metaprogramming over traditional SFINAE / `std::enable_if`?",
                "options": ["They provide first-class compile-time constraints with short-circuit evaluation, clean compiler error diagnostics, and explicit syntax", "They convert all templates into runtime polymorphic interfaces", "They disable compiler optimizations for safety", "They eliminate the need for header files entirely"],
                "answer": "They provide first-class compile-time constraints with short-circuit evaluation, clean compiler error diagnostics, and explicit syntax",
                "topic": "C++20 Concepts"
            }
        ]
    },

    "Java": {
        1: [
            {
                "text": "What is the primary execution unit generated by the Java compiler (`javac`) from source code?",
                "options": ["Bytecode (.class files) executed by the JVM", "Native machine code (.exe or ELF binary)", "Intermediate assembly code (.s files)", "JavaScript bundle"],
                "answer": "Bytecode (.class files) executed by the JVM",
                "topic": "JVM Architecture"
            },
            {
                "text": "Which Java keyword is used to establish inheritance between two classes?",
                "options": ["extends", "implements", "inherits", "instanceof"],
                "answer": "extends",
                "topic": "OOP Basics"
            },
            {
                "text": "Which collection in Java preserves insertion order and allows duplicate elements?",
                "options": ["ArrayList", "HashSet", "TreeSet", "HashMap"],
                "answer": "ArrayList",
                "topic": "Collections"
            }
        ],
        2: [
            {
                "text": "What is the difference between `==` and `.equals()` when comparing two `String` objects in Java?",
                "options": ["`==` compares memory references; `.equals()` compares character content", "`.equals()` compares memory references; `==` compares character content", "Both perform identical deep content comparison", "`==` is only valid for primitive numeric types and throws a compilation error on String"],
                "answer": "`==` compares memory references; `.equals()` compares character content",
                "topic": "Strings & Equality"
            },
            {
                "text": "What happens if an unhandled Checked Exception is thrown inside a Java method?",
                "options": ["The code fails to compile unless declared in the `throws` clause or handled in a `try-catch` block", "The JVM silently ignores the exception at runtime", "The exception is automatically converted into an unchecked RuntimeException", "The OS terminates the entire JVM process immediately"],
                "answer": "The code fails to compile unless declared in the `throws` clause or handled in a `try-catch` block",
                "topic": "Exception Handling"
            },
            {
                "text": "Which interface in Java 8+ represents a functional operation that accepts one argument and produces a result?",
                "options": ["Function<T, R>", "Consumer<T>", "Supplier<T>", "Predicate<T>"],
                "answer": "Function<T, R>",
                "topic": "Functional Interfaces"
            }
        ],
        3: [
            {
                "text": "What is the purpose of the `volatile` keyword on a variable in Java?",
                "options": ["Guarantees visibility of changes across threads by reading and writing directly from main memory", "Locks the variable so only one thread can modify it per second", "Causes the variable to be serialized when writing to disk", "Prevents the variable from being garbage collected"],
                "answer": "Guarantees visibility of changes across threads by reading and writing directly from main memory",
                "topic": "Concurrency"
            },
            {
                "text": "How does `ConcurrentHashMap` achieve thread safety without locking the entire map like `Hashtable`?",
                "options": ["Lock striping and CAS (Compare-And-Swap) operations on individual bucket nodes", "Running all operations on a single background worker thread", "Creating a new deep copy of the map on every mutation", "Using synchronized blocks on every single method call"],
                "answer": "Lock striping and CAS (Compare-And-Swap) operations on individual bucket nodes",
                "topic": "Concurrent Collections"
            },
            {
                "text": "What is the difference between Java's Heap and Stack memory?",
                "options": ["Stack stores method call frames and local primitive variables; Heap stores object instances and arrays", "Heap stores thread call frames; Stack stores shared objects", "Stack is shared across all threads; Heap is private per thread", "There is no difference in modern JVMs"],
                "answer": "Stack stores method call frames and local primitive variables; Heap stores object instances and arrays",
                "topic": "JVM Memory"
            }
        ],
        4: [
            {
                "text": "In the Java Memory Model, what is the 'happens-before' guarantee provided by a `synchronized` block?",
                "options": ["Actions in a thread prior to releasing a monitor lock happen-before another thread acquiring the same monitor lock", "Code inside synchronized blocks runs before the JVM classloader finishes", "The compiler executes synchronized code before main()", "Memory is pinned in L1 CPU cache indefinitely"],
                "answer": "Actions in a thread prior to releasing a monitor lock happen-before another thread acquiring the same monitor lock",
                "topic": "Java Memory Model"
            },
            {
                "text": "How does Java implement Generic types under the hood?",
                "options": ["Type erasure: generic type parameters are replaced with their bounds (or Object) in bytecode, inserting synthetic casts", "Monomorphization: generating distinct bytecode classes for each type instantiation", "Dynamic duck-typing checked by the runtime interpreter", "C-style macros expanded before compilation"],
                "answer": "Type erasure: generic type parameters are replaced with their bounds (or Object) in bytecode, inserting synthetic casts",
                "topic": "Generics & Bytecode"
            },
            {
                "text": "What garbage collection mechanism distinguishes JVM's G1 (Garbage-First) collector from traditional CMS or Parallel GC?",
                "options": ["Divides heap into uniform virtual regions and prioritizes collecting regions with the most reclaimable garbage within a target pause time", "Stops all application threads completely until the entire 100GB heap is swept", "Only collects objects in the young generation, never touching tenured objects", "Relies strictly on reference counting without tracing"],
                "answer": "Divides heap into uniform virtual regions and prioritizes collecting regions with the most reclaimable garbage within a target pause time",
                "topic": "Garbage Collection"
            }
        ],
        5: [
            {
                "text": "What are Project Loom Virtual Threads (introduced in Java 21) and how do they differ from Platform Threads?",
                "options": ["Lightweight user-mode threads managed by the JVM rather than 1:1 OS kernel threads, allowing millions of concurrent tasks with minimal stack memory overhead", "Threads that only execute in cloud containers", "JNI wrappers around C pthreads", "Asynchronous JavaScript promises ported to Java"],
                "answer": "Lightweight user-mode threads managed by the JVM rather than 1:1 OS kernel threads, allowing millions of concurrent tasks with minimal stack memory overhead",
                "topic": "Virtual Threads"
            },
            {
                "text": "What is the JVM JIT compiler's 'Escape Analysis' optimization?",
                "options": ["Determines if an object's reference escapes the allocating method scope; if not, allows scalar replacement and stack allocation", "Scans code for SQL injection vulnerabilities before running", "Prevents memory leaks in circular references", "Encrypts heap pointers during network transmission"],
                "answer": "Determines if an object's reference escapes the allocating method scope; if not, allows scalar replacement and stack allocation",
                "topic": "JIT Optimization"
            },
            {
                "text": "What is the purpose of `VarHandle` (java.lang.invoke) introduced in Java 9 to replace `sun.misc.Unsafe`?",
                "options": ["Provides fine-grained memory access modes (volatile, acquire/release, opaque) with atomic operations in a safe, supported API", "Allows creating native pointers outside JVM bounds without permissions", "Replaces standard Java interfaces with C++ headers", "Provides a graphical debugger for JVM threads"],
                "answer": "Provides fine-grained memory access modes (volatile, acquire/release, opaque) with atomic operations in a safe, supported API",
                "topic": "Low-level JVM APIs"
            }
        ]
    },

    "JavaScript": {
        1: [
            {
                "text": "What is the difference between `let` and `var` declaration scoping in JavaScript?",
                "options": ["`let` is block-scoped; `var` is function-scoped (or globally scoped)", "`var` is block-scoped; `let` is function-scoped", "Both have identical block-scoped semantics", "`let` declarations cannot be reassigned; `var` can be reassigned"],
                "answer": "`let` is block-scoped; `var` is function-scoped (or globally scoped)",
                "topic": "Scope & Declarations"
            },
            {
                "text": "What is the output of `typeof null` in standard JavaScript?",
                "options": ["\"object\"", "\"null\"", "\"undefined\"", "\"boolean\""],
                "answer": "\"object\"",
                "topic": "Types & Quirks"
            },
            {
                "text": "Which array method returns a new array with all elements that satisfy a provided testing function?",
                "options": ["filter()", "map()", "forEach()", "reduce()"],
                "answer": "filter()",
                "topic": "Array Methods"
            }
        ],
        2: [
            {
                "text": "What is a closure in JavaScript?",
                "options": ["A function bundled together with references to its surrounding lexical environment", "A syntax error that occurs when closing brackets are missing", "A method to terminate worker threads", "An encrypted JSON object sent over WebSockets"],
                "answer": "A function bundled together with references to its surrounding lexical environment",
                "topic": "Closures"
            },
            {
                "text": "What is the difference between `==` and `===` in JavaScript?",
                "options": ["`===` checks both value and type without coercion; `==` performs type coercion before comparison", "`==` checks both value and type; `===` performs type coercion", "There is no difference in modern ES6+", "`===` is only used for comparing object references"],
                "answer": "`===` checks both value and type without coercion; `==` performs type coercion before comparison",
                "topic": "Operators"
            },
            {
                "text": "What does `Promise.all([p1, p2])` do if `p1` rejects?",
                "options": ["Immediately rejects with the error of p1 without waiting for p2", "Waits for p2 to finish and returns null", "Retries p1 automatically", "Resolves with [undefined, resultOfP2]"],
                "answer": "Immediately rejects with the error of p1 without waiting for p2",
                "topic": "Promises & Async"
            }
        ],
        3: [
            {
                "text": "In JavaScript's event loop, in what order are Macrotasks (e.g. `setTimeout`) and Microtasks (e.g. `Promise.then`) executed?",
                "options": ["All queued microtasks are executed before the next macrotask is dequeued", "Macrotasks always execute before microtasks", "They run concurrently on separate CPU threads", "Alternating one macrotask then one microtask strictly"],
                "answer": "All queued microtasks are executed before the next macrotask is dequeued",
                "topic": "Event Loop"
            },
            {
                "text": "What is the difference between `Object.freeze()` and `Object.seal()` in JavaScript?",
                "options": ["freeze makes properties read-only and prevents adding/deleting properties; seal prevents adding/deleting properties but allows modifying existing writable values", "seal makes properties read-only; freeze allows deletions", "Both methods are completely identical", "freeze only applies to arrays; seal applies to objects"],
                "answer": "freeze makes properties read-only and prevents adding/deleting properties; seal prevents adding/deleting properties but allows modifying existing writable values",
                "topic": "Object Mutability"
            },
            {
                "text": "How does the `this` keyword behave inside an Arrow Function compared to a standard function?",
                "options": ["Arrow functions do not bind their own `this`; they retain the lexical `this` of the enclosing scope", "Arrow functions bind `this` to the global window/global object always", "Arrow functions bind `this` to their own prototype", "Arrow functions throw a TypeError if `this` is referenced"],
                "answer": "Arrow functions do not bind their own `this`; they retain the lexical `this` of the enclosing scope",
                "topic": "Lexical Scope"
            }
        ],
        4: [
            {
                "text": "What is a `WeakMap` in JavaScript and why does it enable memory-safe private object data?",
                "options": ["Keys must be objects and are held weakly, allowing garbage collection when no other references to the key object exist", "It encrypts values using SHA-256 in memory", "It automatically clears itself every 60 seconds", "It limits the map to a maximum of 100 entries"],
                "answer": "Keys must be objects and are held weakly, allowing garbage collection when no other references to the key object exist",
                "topic": "Garbage Collection & WeakRefs"
            },
            {
                "text": "What occurs during JavaScript's 'Temporal Dead Zone' (TDZ)?",
                "options": ["The period between entering block scope and the variable's declaration where accessing `let` or `const` throws a ReferenceError", "The time it takes for garbage collection to run", "The duration where Web Workers cannot communicate with DOM", "The latency between browser DNS lookup and HTTP response"],
                "answer": "The period between entering block scope and the variable's declaration where accessing `let` or `const` throws a ReferenceError",
                "topic": "Execution Context"
            },
            {
                "text": "How does `Proxy` with `Reflect` enable transparent object meta-programming in modern JavaScript?",
                "options": ["Proxy traps core operations (get, set, deleteProperty) while Reflect provides default forwarding implementations with proper receiver binding", "Proxy copies the object into a WebAssembly container", "Reflect converts objects into immutable strings", "It forces all object mutations to be asynchronous"],
                "answer": "Proxy traps core operations (get, set, deleteProperty) while Reflect provides default forwarding implementations with proper receiver binding",
                "topic": "Proxy & Reflect"
            }
        ],
        5: [
            {
                "text": "In modern V8 engine architecture, how do Hidden Classes (Shapes) and Inline Caching (IC) optimize object property access?",
                "options": ["V8 creates shared transition trees of hidden classes based on property addition order, allowing call sites to cache memory offsets directly", "V8 converts all objects into flat C-arrays at build time", "V8 disables garbage collection on frequently accessed objects", "V8 stores all object keys in a single global red-black tree"],
                "answer": "V8 creates shared transition trees of hidden classes based on property addition order, allowing call sites to cache memory offsets directly",
                "topic": "V8 Internals"
            },
            {
                "text": "What is the exact execution order in Node.js event loop phases?",
                "options": ["Timers -> Pending I/O -> Idle/Prepare -> Poll -> Check (setImmediate) -> Close callbacks", "Poll -> Timers -> Check -> Close -> Pending I/O", "Check -> Timers -> Poll -> Close -> Pending", "Timers and setImmediate execute in strictly random order"],
                "answer": "Timers -> Pending I/O -> Idle/Prepare -> Poll -> Check (setImmediate) -> Close callbacks",
                "topic": "Node Event Loop Phases"
            },
            {
                "text": "How do JavaScript SharedArrayBuffer and Atomics coordinate multi-threaded memory access across Web Workers without data races?",
                "options": ["SharedArrayBuffer allows sharing raw binary memory while Atomics provide atomic read/write, CAS operations, and wait/notify synchronization primitives", "Workers communicate via postMessage without sharing memory buffers", "It creates synchronized copies across thread boundaries", "It executes threads in sequential order"],
                "answer": "SharedArrayBuffer allows sharing raw binary memory while Atomics provide atomic read/write, CAS operations, and wait/notify synchronization primitives",
                "topic": "Concurrency & Memory"
            }
        ]
    },

    "Docker": {
        1: [
            {
                "text": "What is the primary purpose of Docker containerization compared to a traditional Virtual Machine?",
                "options": ["Containers share the host OS kernel and isolate user space, resulting in lightweight startup and minimal overhead", "Containers package an entire guest operating system with a hypervisor", "Containers can only run on Linux and cannot run on Windows or macOS", "Containers provide hardware virtualization"],
                "answer": "Containers share the host OS kernel and isolate user space, resulting in lightweight startup and minimal overhead",
                "topic": "Containers vs VMs"
            },
            {
                "text": "Which Docker CLI command is used to list all currently running containers?",
                "options": ["docker ps", "docker images", "docker list", "docker run"],
                "answer": "docker ps",
                "topic": "CLI Commands"
            },
            {
                "text": "What is the purpose of the `FROM` instruction in a Dockerfile?",
                "options": ["Specifies the base image from which the new container image will be built", "Copies files from the host into the container", "Exposes a network port", "Defines the user that executes commands"],
                "answer": "Specifies the base image from which the new container image will be built",
                "topic": "Dockerfile Instructions"
            }
        ],
        2: [
            {
                "text": "What is the difference between `CMD` and `ENTRYPOINT` in a Dockerfile?",
                "options": ["ENTRYPOINT configures the container to run as an executable; CMD provides default arguments that can be easily overridden via CLI", "CMD cannot be overridden; ENTRYPOINT is always ignored if arguments are passed", "Both instructions perform identical operations", "ENTRYPOINT is only executed when building the image"],
                "answer": "ENTRYPOINT configures the container to run as an executable; CMD provides default arguments that can be easily overridden via CLI",
                "topic": "Dockerfile Directives"
            },
            {
                "text": "What is the difference between `COPY` and `ADD` in a Dockerfile?",
                "options": ["COPY copies local files; ADD also supports automatic tar extraction and remote URL downloads", "ADD only works for text files; COPY is for binaries", "COPY is deprecated in Docker 20+", "Both have identical functionality with different names"],
                "answer": "COPY copies local files; ADD also supports automatic tar extraction and remote URL downloads",
                "topic": "Image Building"
            },
            {
                "text": "What is the purpose of a Docker Volume (`docker volume create`)?",
                "options": ["Persisting data outside the container's writable layer across restarts and removals", "Increasing the container's maximum RAM capacity", "Compressing the container image for registry push", "Encrypting container network traffic"],
                "answer": "Persisting data outside the container's writable layer across restarts and removals",
                "topic": "Volumes & Storage"
            }
        ],
        3: [
            {
                "text": "Why are Multi-Stage Builds used in Dockerfiles?",
                "options": ["To separate build tools and dependencies from the final minimal runtime image, reducing production image size and attack surface", "To run multiple containers on a single host simultaneously", "To deploy containers automatically to Kubernetes clusters", "To bypass Docker licensing restrictions"],
                "answer": "To separate build tools and dependencies from the final minimal runtime image, reducing production image size and attack surface",
                "topic": "Multi-Stage Builds"
            },
            {
                "text": "What does the Docker command `docker run -p 8080:80 nginx` do?",
                "options": ["Maps port 8080 on the host to port 80 inside the nginx container", "Maps port 80 on the host to port 8080 inside the container", "Exposes ports 8080 through 80 on host firewalls", "Launches 8080 instances of nginx"],
                "answer": "Maps port 8080 on the host to port 80 inside the nginx container",
                "topic": "Networking"
            },
            {
                "text": "What is the default Docker network driver assigned to standalone containers when no network is specified?",
                "options": ["bridge", "host", "overlay", "macvlan"],
                "answer": "bridge",
                "topic": "Network Drivers"
            }
        ],
        4: [
            {
                "text": "What Linux kernel technologies form the underlying isolation primitives of Docker containers?",
                "options": ["Namespaces (for resource view isolation) and Cgroups (for resource utilization limits)", "VirtualBox hypervisors and KVM", "SELinux and AppArmor alone without kernel integration", "Systemd units and cron jobs"],
                "answer": "Namespaces (for resource view isolation) and Cgroups (for resource utilization limits)",
                "topic": "Kernel Primitives"
            },
            {
                "text": "How does Docker's copy-on-write (CoW) overlay2 storage driver manage layer mutations?",
                "options": ["Image layers are read-only; container mutations occur in a thin writable top layer, copying modified files up on first write", "Every write duplicates the entire 500MB image layer", "Mutations directly overwrite base image layers on disk", "Writes are buffered in memory and flushed only upon container stop"],
                "answer": "Image layers are read-only; container mutations occur in a thin writable top layer, copying modified files up on first write",
                "topic": "Storage Drivers"
            },
            {
                "text": "What is the purpose of the `--init` flag in `docker run`?",
                "options": ["Runs a lightweight init process (like tini) as PID 1 to reap zombie processes and forward UNIX signals properly", "Formats the container filesystem before launch", "Initializes a Git repository inside the container", "Runs systemd as the primary container daemon"],
                "answer": "Runs a lightweight init process (like tini) as PID 1 to reap zombie processes and forward UNIX signals properly",
                "topic": "Container Init & Signals"
            }
        ],
        5: [
            {
                "text": "In container security, why is running containers with `USER 10001` (non-root) and `--cap-drop=ALL` critical even inside an isolated namespace?",
                "options": ["Prevents container escape vulnerabilities from obtaining host root access via kernel vulnerabilities or mapped socket exploits", "Reduces image pull size from Docker Hub", "Required by Docker engine for running multi-stage builds", "Allows the container to bypass CPU quotas"],
                "answer": "Prevents container escape vulnerabilities from obtaining host root access via kernel vulnerabilities or mapped socket exploits",
                "topic": "Container Security"
            },
            {
                "text": "What is the architectural role of `containerd` and `runc` in the Docker runtime stack?",
                "options": ["containerd manages the container lifecycle and image distribution; runc is the OCI reference runtime that directly executes containers via Linux system calls", "runc is the Docker daemon UI; containerd is the Docker registry", "containerd compiles Dockerfiles; runc manages network bridges", "Both have been deprecated by Podman"],
                "answer": "containerd manages the container lifecycle and image distribution; runc is the OCI reference runtime that directly executes containers via Linux system calls",
                "topic": "OCI Runtime Architecture"
            },
            {
                "text": "How does Docker BuildKit improve build performance and caching compared to the legacy builder?",
                "options": ["Concurrent multi-stage execution, parallel dependency resolution, secret mount mounts without image commits, and remote cache backends", "Running builds without any caching", "Converting Dockerfiles into C++ before compiling", "Compiling images directly into virtual disk .vmdk files"],
                "answer": "Concurrent multi-stage execution, parallel dependency resolution, secret mount mounts without image commits, and remote cache backends",
                "topic": "BuildKit Architecture"
            }
        ]
    },

    "HTML": {
        1: [
            {
                "text": "What does the `<!DOCTYPE html>` declaration at the top of an HTML document signify?",
                "options": ["Informs the browser that the document is written in modern HTML5 and should be rendered in standards mode", "Imports HTML5 styling rules from W3C servers", "A comment ignored by all web browsers", "Declares that the page contains server-side PHP"],
                "answer": "Informs the browser that the document is written in modern HTML5 and should be rendered in standards mode",
                "topic": "HTML5 Basics"
            },
            {
                "text": "Which HTML element represents the primary navigation section of links on a webpage?",
                "options": ["<nav>", "<section>", "<aside>", "<header>"],
                "answer": "<nav>",
                "topic": "Semantic Elements"
            },
            {
                "text": "What attribute on an `<a>` tag specifies the destination URL of a hyperlink?",
                "options": ["href", "src", "link", "target"],
                "answer": "href",
                "topic": "Links & Attributes"
            }
        ],
        2: [
            {
                "text": "What is the purpose of the `alt` attribute on an `<img>` tag in HTML?",
                "options": ["Provides alternative text for screen readers, accessibility, and when the image fails to load", "Defines the tooltip text shown when hovering over the image", "Specifies a fallback image URL", "Sets the aspect ratio for responsive design"],
                "answer": "Provides alternative text for screen readers, accessibility, and when the image fails to load",
                "topic": "Accessibility"
            },
            {
                "text": "Which HTML element should be used to display pre-formatted text preserving spaces and line breaks?",
                "options": ["<pre>", "<code>", "<blockquote>", "<p>"],
                "answer": "<pre>",
                "topic": "Typography"
            },
            {
                "text": "What is the difference between `localStorage` and `sessionStorage` in HTML5 Web Storage API?",
                "options": ["localStorage data persists until explicitly deleted; sessionStorage data clears when the browser tab closes", "sessionStorage persists permanently; localStorage clears on tab close", "localStorage is limited to 4KB; sessionStorage is 500MB", "localStorage is only accessible via HTTPS"],
                "answer": "localStorage data persists until explicitly deleted; sessionStorage data clears when the browser tab closes",
                "topic": "Web Storage"
            }
        ],
        3: [
            {
                "text": "What is the difference between `<script async>` and `<script defer>` in HTML?",
                "options": ["`defer` downloads in parallel and executes in document order after HTML parsing completes; `async` executes immediately once downloaded, pausing parsing", "`async` executes after DOM is parsed; `defer` pauses parsing immediately", "`defer` is only supported in legacy Internet Explorer", "Both attributes prevent the script from executing at all"],
                "answer": "`defer` downloads in parallel and executes in document order after HTML parsing completes; `async` executes immediately once downloaded, pausing parsing",
                "topic": "Script Loading"
            },
            {
                "text": "What is the purpose of ARIA attributes (e.g. `aria-label`, `aria-hidden`) in HTML?",
                "options": ["Provides semantic accessibility information to assistive technologies when standard HTML elements are insufficient", "Accelerates CSS animation rendering", "Enforces strict input validation on forms", "Encrypts sensitive form data"],
                "answer": "Provides semantic accessibility information to assistive technologies when standard HTML elements are insufficient",
                "topic": "WAI-ARIA Accessibility"
            },
            {
                "text": "Which HTML tag is used to embed vector graphics directly into the DOM tree?",
                "options": ["<svg>", "<canvas>", "<picture>", "<video>"],
                "answer": "<svg>",
                "topic": "Graphics"
            }
        ],
        4: [
            {
                "text": "What is the difference between `<canvas>` and `<svg>` rendering models?",
                "options": ["Canvas is raster-based (immediate mode pixel manipulation via JavaScript); SVG is vector-based (retained mode with DOM nodes for each shape)", "Canvas scales infinitely without pixelation; SVG pixelates on zoom", "SVG cannot respond to user click events", "Canvas elements can be styled with CSS pseudo-classes"],
                "answer": "Canvas is raster-based (immediate mode pixel manipulation via JavaScript); SVG is vector-based (retained mode with DOM nodes for each shape)",
                "topic": "Canvas vs SVG"
            },
            {
                "text": "What is the Content Security Policy (CSP) `<meta>` tag used for in HTML?",
                "options": ["Restricts resource origins (scripts, styles, images) to mitigate Cross-Site Scripting (XSS) and data injection attacks", "Controls browser caching duration for the HTML file", "Sets responsive viewport zoom constraints on mobile devices", "Forces the page to render in dark mode"],
                "answer": "Restricts resource origins (scripts, styles, images) to mitigate Cross-Site Scripting (XSS) and data injection attacks",
                "topic": "Web Security"
            },
            {
                "text": "How does the HTML5 `<template>` element behave when loaded into a webpage?",
                "options": ["Its content is parsed into document fragments but not rendered or executed until activated via JavaScript", "It automatically generates a React component", "It loads external HTML files via AJAX", "It renders hidden behind an invisible overlay"],
                "answer": "Its content is parsed into document fragments but not rendered or executed until activated via JavaScript",
                "topic": "Web Components"
            }
        ],
        5: [
            {
                "text": "In the Web Components specification, what is the 'Shadow DOM' and what problem does it solve?",
                "options": ["Provides encapsulated scoping for DOM subtrees and CSS styles, preventing component styles from leaking into or being overridden by page styles", "A hidden frame for running background crypto mining", "A technique for pre-rendering pages in memory", "A backup copy of the DOM in case of browser crashes"],
                "answer": "Provides encapsulated scoping for DOM subtrees and CSS styles, preventing component styles from leaking into or being overridden by page styles",
                "topic": "Shadow DOM"
            },
            {
                "text": "How does the browser's Critical Rendering Path (CRP) process HTML bytes into rendered pixels?",
                "options": ["Bytes -> Characters -> Tokens -> Nodes -> DOM Tree + CSSOM Tree -> Render Tree -> Layout (Reflow) -> Paint", "HTML -> Paint -> Layout -> DOM -> CSSOM", "DOM -> Tokens -> Bytes -> Layout -> Paint", "CSSOM -> DOM -> Tokens -> Framebuffer"],
                "answer": "Bytes -> Characters -> Tokens -> Nodes -> DOM Tree + CSSOM Tree -> Render Tree -> Layout (Reflow) -> Paint",
                "topic": "Browser Internals"
            },
            {
                "text": "What is the difference between layout thrashing and regular reflow during DOM manipulation?",
                "options": ["Layout thrashing occurs when JavaScript repeatedly interleaves DOM writes and forced layout reads (e.g. `offsetHeight`), forcing multiple synchronous reflows", "Layout thrashing is caused by invalid CSS selectors", "Regular reflow is triggered by JavaScript; layout thrashing is triggered by CSS animations", "There is no difference; they are synonyms"],
                "answer": "Layout thrashing occurs when JavaScript repeatedly interleaves DOM writes and forced layout reads (e.g. `offsetHeight`), forcing multiple synchronous reflows",
                "topic": "DOM Performance"
            }
        ]
    },

    "CSS": {
        1: [
            {
                "text": "What are the four components of the traditional CSS Box Model from inside out?",
                "options": ["Content, Padding, Border, Margin", "Content, Margin, Border, Padding", "Padding, Content, Border, Margin", "Border, Margin, Padding, Content"],
                "answer": "Content, Padding, Border, Margin",
                "topic": "Box Model"
            },
            {
                "text": "Which CSS property is used to change the background color of an element?",
                "options": ["background-color", "color", "bgcolor", "fill-color"],
                "answer": "background-color",
                "topic": "Styling"
            },
            {
                "text": "What does the `*` selector represent in CSS?",
                "options": ["Universal selector matching every element in the document", "Selector matching only top-level <div> tags", "A wildcard matching class names", "A comment indicator"],
                "answer": "Universal selector matching every element in the document",
                "topic": "Selectors"
            }
        ],
        2: [
            {
                "text": "What does `box-sizing: border-box` do in CSS?",
                "options": ["Includes padding and border within the specified width and height of the element", "Adds extra margin to the outside of the border", "Removes borders from all child elements", "Forces elements into a grid layout"],
                "answer": "Includes padding and border within the specified width and height of the element",
                "topic": "Box Sizing"
            },
            {
                "text": "What is the difference between `position: absolute` and `position: relative` in CSS?",
                "options": ["`absolute` positions relative to its nearest positioned ancestor; `relative` positions relative to its normal flow position", "`relative` removes the element from normal document flow; `absolute` preserves it", "`absolute` positions relative to the screen; `relative` positions relative to parent always", "Both behave identically"],
                "answer": "`absolute` positions relative to its nearest positioned ancestor; `relative` positions relative to its normal flow position",
                "topic": "Positioning"
            },
            {
                "text": "Which CSS Flexbox property aligns items along the cross axis?",
                "options": ["align-items", "justify-content", "flex-direction", "flex-wrap"],
                "answer": "align-items",
                "topic": "Flexbox"
            }
        ],
        3: [
            {
                "text": "How does CSS Specificity calculate which rule wins when multiple conflicting selectors target the same element?",
                "options": ["Inline styles (1000) > IDs (100) > Classes/Attributes/Pseudo-classes (10) > Elements/Pseudo-elements (1)", "IDs (1000) > Classes (100) > Inline styles (10)", "Whichever CSS file was loaded last always wins regardless of selectors", "The rule with the fewest characters wins"],
                "answer": "Inline styles (1000) > IDs (100) > Classes/Attributes/Pseudo-classes (10) > Elements/Pseudo-elements (1)",
                "topic": "Specificity"
            },
            {
                "text": "What is the difference between CSS Grid and Flexbox in terms of layout dimensions?",
                "options": ["Grid is designed for two-dimensional layouts (rows and columns simultaneously); Flexbox is primarily one-dimensional (row or column)", "Flexbox is two-dimensional; Grid is one-dimensional", "Grid only works with fixed pixels; Flexbox only uses percentages", "Flexbox is deprecated in modern CSS"],
                "answer": "Grid is designed for two-dimensional layouts (rows and columns simultaneously); Flexbox is primarily one-dimensional (row or column)",
                "topic": "Grid vs Flexbox"
            },
            {
                "text": "What CSS unit is relative to the font-size of the root `<html>` element?",
                "options": ["rem", "em", "vh", "%"],
                "answer": "rem",
                "topic": "Units"
            }
        ],
        4: [
            {
                "text": "What is a Stacking Context in CSS and what triggers its creation?",
                "options": ["A 3D conceptual layering of elements triggered by properties like opacity < 1, transform != none, position with z-index, or will-change", "A flexbox container containing more than 10 children", "A media query with max-width", "The document header navigation bar"],
                "answer": "A 3D conceptual layering of elements triggered by properties like opacity < 1, transform != none, position with z-index, or will-change",
                "topic": "Stacking Context & Z-Index"
            },
            {
                "text": "Why are `transform` and `opacity` the most performant CSS properties for animations?",
                "options": ["They are handled on the GPU compositor thread without triggering layout (reflow) or repaint on the main thread", "They bypass the GPU completely for CPU calculations", "They compile into WebAssembly before running", "They are the only properties supported by mobile browsers"],
                "answer": "They are handled on the GPU compositor thread without triggering layout (reflow) or repaint on the main thread",
                "topic": "Performance & Compositing"
            },
            {
                "text": "What is a Block Formatting Context (BFC) and how does it prevent margin collapse and contain floated elements?",
                "options": ["An isolated box rendering region where internal floats are contained and vertical margins do not collapse with outside elements", "A CSS preprocessor compiler flag in SASS", "A flex container with flex-wrap: wrap", "A table element with border-collapse"],
                "answer": "An isolated box rendering region where internal floats are contained and vertical margins do not collapse with outside elements",
                "topic": "BFC"
            }
        ],
        5: [
            {
                "text": "What is the purpose of the `@layer` directive (CSS Cascade Layers) introduced in modern CSS?",
                "options": ["Allows developers to explicitly order stylesheet cascade priority regardless of selector specificity within the layers", "Creates 3D parallax effects on scroll", "Enables layer-based image compression", "Replaces CSS variables with SASS functions"],
                "answer": "Allows developers to explicitly order stylesheet cascade priority regardless of selector specificity within the layers",
                "topic": "Cascade Layers"
            },
            {
                "text": "How does Container Queries (`@container`) differ fundamentally from Media Queries (`@media`)?",
                "options": ["Container queries evaluate styles based on the size of an ancestor container element rather than the entire browser viewport", "Container queries only work inside Docker containers", "Media queries can only inspect audio and video elements", "Container queries require external JavaScript libraries"],
                "answer": "Container queries evaluate styles based on the size of an ancestor container element rather than the entire browser viewport",
                "topic": "Container Queries"
            },
            {
                "text": "What does the `content-visibility: auto` CSS property achieve for initial page render performance?",
                "options": ["Skips layout and rendering of off-screen elements until they near the viewport, drastically speeding up initial page load", "Hides all text content until images are downloaded", "Converts HTML elements into WebP images", "Automatically translates text into the user's locale"],
                "answer": "Skips layout and rendering of off-screen elements until they near the viewport, drastically speeding up initial page load",
                "topic": "Rendering Optimization"
            }
        ]
    },

    "C": {
        1: [
            {
                "text": "What does the `&` operator do when placed before a variable name in C (e.g. `&x`)?",
                "options": ["Returns the memory address of the variable", "Dereferences a pointer", "Performs bitwise NOT", "Multiplies the variable"],
                "answer": "Returns the memory address of the variable",
                "topic": "Pointers & Addresses"
            },
            {
                "text": "What is the return type of the `main()` function according to standard C?",
                "options": ["int", "void", "float", "char*"],
                "answer": "int",
                "topic": "Functions"
            },
            {
                "text": "What character is used in C to terminate a string array in memory?",
                "options": ["'\\0' (null terminator)", "'\\n'", "' '", "EOF"],
                "answer": "'\\0' (null terminator)",
                "topic": "Strings"
            }
        ],
        2: [
            {
                "text": "What is the difference between `malloc()` and `calloc()` in C?",
                "options": ["`malloc()` leaves memory uninitialized (containing garbage); `calloc()` initializes all allocated bytes to zero", "`malloc()` allocates zeroed memory; `calloc()` leaves garbage", "`malloc()` allocates stack memory; `calloc()` allocates heap memory", "`calloc()` can never fail; `malloc()` can"],
                "answer": "`malloc()` leaves memory uninitialized (containing garbage); `calloc()` initializes all allocated bytes to zero",
                "topic": "Dynamic Memory"
            },
            {
                "text": "What happens if you allocate memory with `malloc()` and never call `free()` before program exit in a long-running daemon?",
                "options": ["Memory leak: the allocated memory remains consumed and unavailable until the process terminates", "The OS garbage collector reclaims it automatically after 5 minutes", "The C runtime throws a NullPointerException", "The CPU thermal throttles"],
                "answer": "Memory leak: the allocated memory remains consumed and unavailable until the process terminates",
                "topic": "Memory Management"
            },
            {
                "text": "What is the size of a pointer variable on a 64-bit architecture in C?",
                "options": ["8 bytes", "4 bytes", "16 bytes", "2 bytes"],
                "answer": "8 bytes",
                "topic": "Data Types & Sizes"
            }
        ],
        3: [
            {
                "text": "What does the `static` keyword mean when applied to a global variable or function in C?",
                "options": ["Limits the scope of the variable/function to the current translation unit (.c file), giving it internal linkage", "Prevents the variable from being modified (makes it const)", "Allocates the variable in dynamic heap memory", "Causes the function to run before main()"],
                "answer": "Limits the scope of the variable/function to the current translation unit (.c file), giving it internal linkage",
                "topic": "Linkage & Scope"
            },
            {
                "text": "What is a 'dangling pointer' in C?",
                "options": ["A pointer that points to a memory address that has already been freed or deallocated", "A pointer that has been explicitly initialized to NULL", "A pointer pointing to static read-only string literals", "A function pointer"],
                "answer": "A pointer that points to a memory address that has already been freed or deallocated",
                "topic": "Pointer Safety"
            },
            {
                "text": "What is the difference between `struct` and `union` in C?",
                "options": ["In a struct, all members have distinct memory locations; in a union, all members share the same memory location (size = largest member)", "In a union, all members have distinct memory; in a struct they share memory", "structs are stack-allocated; unions are heap-allocated", "unions can only contain primitive integers"],
                "answer": "In a struct, all members have distinct memory locations; in a union, all members share the same memory location (size = largest member)",
                "topic": "Structs & Unions"
            }
        ],
        4: [
            {
                "text": "Why is the use of `gets()` strictly prohibited and removed from the modern C11 standard?",
                "options": ["It lacks any buffer boundary checks, making buffer overflow exploits unavoidable when input exceeds buffer size", "It converts all characters to lowercase", "It is slower than scanf", "It only supports ASCII and cannot handle UTF-8"],
                "answer": "It lacks any buffer boundary checks, making buffer overflow exploits unavoidable when input exceeds buffer size",
                "topic": "Security & Buffer Overflows"
            },
            {
                "text": "What does memory alignment (padding) in C struct memory layout mean?",
                "options": ["Data members are aligned to memory addresses that are multiples of their size to satisfy CPU memory bus architecture, inserting padding bytes", "All members are encrypted with random byte masks", "Every struct must be exactly 64 bytes wide", "The compiler reorders functions to fit cache lines"],
                "answer": "Data members are aligned to memory addresses that are multiples of their size to satisfy CPU memory bus architecture, inserting padding bytes",
                "topic": "Struct Alignment & Padding"
            },
            {
                "text": "What is the behavior of reading uninitialized stack memory in C?",
                "options": ["Undefined behavior; it yields unpredictable garbage values previously present in that memory location", "Guaranteed to return 0", "Causes a hardware segmentation fault", "Throws a compile-time assertion"],
                "answer": "Undefined behavior; it yields unpredictable garbage values previously present in that memory location",
                "topic": "Undefined Behavior"
            }
        ],
        5: [
            {
                "text": "In C, what is the Strict Aliasing Rule and how does `__restrict` optimize pointer dereferencing?",
                "options": ["Two pointers of incompatible types cannot point to the same memory location; `restrict` tells the compiler the pointer is the sole reference to that memory, allowing register caching across writes", "All pointers must be strictly typed as void*", "Prevents function recursion", "Forces memory writes to bypass CPU L1 cache"],
                "answer": "Two pointers of incompatible types cannot point to the same memory location; `restrict` tells the compiler the pointer is the sole reference to that memory, allowing register caching across writes",
                "topic": "Compiler Optimization & Aliasing"
            },
            {
                "text": "What occurs during a stack buffer overflow that overwrites the Saved Frame Pointer (SFP) and Return Address?",
                "options": ["When the function executes `ret`, instruction pointer (EIP/RIP) jumps to an attacker-controlled address or shellcode, causing arbitrary code execution", "The CPU enters infinite halt state", "The operating system automatically fixes the stack pointer", "The compiler generates a core dump and resumes normal execution"],
                "answer": "When the function executes `ret`, instruction pointer (EIP/RIP) jumps to an attacker-controlled address or shellcode, causing arbitrary code execution",
                "topic": "Exploitation & Stack Smashing"
            },
            {
                "text": "What is the difference between `setjmp()` and `longjmp()` in C?",
                "options": ["`setjmp()` saves the current execution context (registers, stack pointer); `longjmp()` restores that context to perform non-local gotos across stack frames", "They are standard thread creation primitives in C11", "They dynamically resize heap arrays", "They allocate memory on NUMA nodes"],
                "answer": "`setjmp()` saves the current execution context (registers, stack pointer); `longjmp()` restores that context to perform non-local gotos across stack frames",
                "topic": "Low-Level Control Flow"
            }
        ]
    },

    "Operating Systems": {
        1: [
            {
                "text": "What is the primary role of an Operating System kernel?",
                "options": ["Core component managing system hardware, memory, CPU scheduling, and process lifecycle", "The web browser running internet applications", "A database engine storing user files", "A graphics design application"],
                "answer": "Core component managing system hardware, memory, CPU scheduling, and process lifecycle",
                "topic": "Kernel Fundamentals"
            },
            {
                "text": "What is the difference between a process and a thread in an operating system?",
                "options": ["A process has its own dedicated address space; threads within a process share the same address space", "A thread has its own address space; processes share address spaces", "Processes cannot run concurrently; only threads can", "Threads can only execute on single-core CPUs"],
                "answer": "A process has its own dedicated address space; threads within a process share the same address space",
                "topic": "Processes vs Threads"
            },
            {
                "text": "What is a system call (syscall) in operating systems?",
                "options": ["The programmatic interface for user-space programs to request privileged services from the OS kernel", "A voice call over IP", "A hardware interrupt from a keyboard", "A compiler error"],
                "answer": "The programmatic interface for user-space programs to request privileged services from the OS kernel",
                "topic": "System Calls"
            }
        ],
        2: [
            {
                "text": "What are the four necessary conditions for a Deadlock to occur (Coffman conditions)?",
                "options": ["Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait", "Starvation, Race Condition, Deadlock, Livelock", "Paging, Segmentation, Swapping, Thrashing", "First-In-First-Out, Round Robin, Priority, Multilevel"],
                "answer": "Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait",
                "topic": "Deadlock"
            },
            {
                "text": "What is a Race Condition in concurrent programming?",
                "options": ["A situation where the outcome depends on the non-deterministic interleaving or timing of competing threads accessing shared state", "A performance benchmark comparing CPU speeds", "A loop that finishes in under 1 millisecond", "A deadlock between two hardware buses"],
                "answer": "A situation where the outcome depends on the non-deterministic interleaving or timing of competing threads accessing shared state",
                "topic": "Synchronization"
            },
            {
                "text": "What is the function of the Round Robin (RR) CPU scheduling algorithm?",
                "options": ["Assigns a fixed time quantum per process and cycles through the ready queue in circular order", "Always executes the process with the shortest burst time first", "Executes processes based strictly on user VIP priority", "Never preempts a running process"],
                "answer": "Assigns a fixed time quantum per process and cycles through the ready queue in circular order",
                "topic": "CPU Scheduling"
            }
        ],
        3: [
            {
                "text": "What is Virtual Memory and what major capability does it provide to processes?",
                "options": ["An illusion of large, contiguous private memory for each process using hardware address translation (MMU) mapped to physical RAM or disk", "RAM chips that operate virtually in the cloud", "Memory that is wiped every time a function returns", "A software cache for hard drive sectors"],
                "answer": "An illusion of large, contiguous private memory for each process using hardware address translation (MMU) mapped to physical RAM or disk",
                "topic": "Virtual Memory"
            },
            {
                "text": "What is a 'Page Fault' in an operating system?",
                "options": ["An interrupt raised by the hardware MMU when a program accesses a virtual page that is not currently mapped into physical RAM", "A syntax error in an HTML page", "A corrupted hard drive sector that cannot be read", "An out of memory error terminating the kernel"],
                "answer": "An interrupt raised by the hardware MMU when a program accesses a virtual page that is not currently mapped into physical RAM",
                "topic": "Paging & Memory"
            },
            {
                "text": "What is the difference between preemptive and non-preemptive scheduling?",
                "options": ["Preemptive allows the OS to interrupt a running process before its burst finishes; non-preemptive lets the process hold the CPU until it yields or terminates", "Non-preemptive allows interrupts; preemptive does not", "Preemptive is only used for batch systems", "Non-preemptive scheduling requires multiple CPU sockets"],
                "answer": "Preemptive allows the OS to interrupt a running process before its burst finishes; non-preemptive lets the process hold the CPU until it yields or terminates",
                "topic": "Scheduling Models"
            }
        ],
        4: [
            {
                "text": "What is 'Thrashing' in an operating system's virtual memory subsystem?",
                "options": ["A state where the system spends more time swapping pages in and out of disk than executing useful instructions due to insufficient physical RAM", "A hardware fault in the CPU cooling fan", "Corrupting file directory pointers", "A high volume of network packets flooding a socket"],
                "answer": "A state where the system spends more time swapping pages in and out of disk than executing useful instructions due to insufficient physical RAM",
                "topic": "Thrashing & Paging"
            },
            {
                "text": "What is the Translation Lookaside Buffer (TLB) and why is it essential for virtual memory performance?",
                "options": ["A hardware cache of recent virtual-to-physical address translations that avoids costly multi-level page table walks in main memory", "A disk cache for database transactions", "A buffer holding pending system calls", "A register holding the current process PID"],
                "answer": "A hardware cache of recent virtual-to-physical address translations that avoids costly multi-level page table walks in main memory",
                "topic": "Hardware MMU & TLB"
            },
            {
                "text": "What is the difference between a Monolithic Kernel (e.g. Linux) and a Microkernel (e.g. seL4, QNX)?",
                "options": ["Monolithic kernels run all OS services (drivers, file systems, networking) in supervisor mode; microkernels run minimal primitives in kernel mode and services in user space", "Microkernels are always faster than monolithic kernels", "Monolithic kernels cannot run on servers", "Microkernels do not support multi-threading"],
                "answer": "Monolithic kernels run all OS services (drivers, file systems, networking) in supervisor mode; microkernels run minimal primitives in kernel mode and services in user space",
                "topic": "Kernel Architectures"
            }
        ],
        5: [
            {
                "text": "How does the Linux CFS (Completely Fair Scheduler) determine the next process to execute on a CPU core?",
                "options": ["Selects the task with the smallest `vruntime` (virtual runtime) using a self-balancing red-black tree (O(log N))", "Picks randomly from an array of threads", "Uses a FIFO queue without priority weighting", "Sorts threads by PID number"],
                "answer": "Selects the task with the smallest `vruntime` (virtual runtime) using a self-balancing red-black tree (O(log N))",
                "topic": "Linux CFS Internals"
            },
            {
                "text": "What is a 'Copy-on-Write' (COW) optimization during the Linux `fork()` system call?",
                "options": ["Child and parent processes share the same physical memory pages read-only until one writes to a page, at which point only that 4KB page is duplicated", "The entire 8GB parent memory is immediately cloned into a new RAM space", "The child process runs without any memory until execve()", "Writes are saved directly to disk files"],
                "answer": "Child and parent processes share the same physical memory pages read-only until one writes to a page, at which point only that 4KB page is duplicated",
                "topic": "Fork & Virtual Memory"
            },
            {
                "text": "What are hardware Meltdown and Spectre speculative execution CPU vulnerabilities and how does KPTI (Kernel Page Table Isolation) mitigate Meltdown?",
                "options": ["CPUs speculatively execute instructions past branch predictions leaving cache traces; KPTI separates user and kernel page tables completely to prevent user-space reading kernel memory via cache timing", "They are computer viruses that delete the boot sector", "KPTI encrypts RAM using 256-bit AES keys", "They are software bugs in the gcc compiler"],
                "answer": "CPUs speculatively execute instructions past branch predictions leaving cache traces; KPTI separates user and kernel page tables completely to prevent user-space reading kernel memory via cache timing",
                "topic": "Hardware Security & Kernels"
            }
        ]
    },

    "DBMS": {
        1: [
            {
                "text": "What do the letters in the database acronym ACID stand for?",
                "options": ["Atomicity, Consistency, Isolation, Durability", "Accuracy, Concurrency, Integrity, Durability", "Atomicity, Coherence, Independence, Distribution", "Access, Control, Indexing, Data"],
                "answer": "Atomicity, Consistency, Isolation, Durability",
                "topic": "ACID Properties"
            },
            {
                "text": "What is a Primary Key in a relational database?",
                "options": ["A column or set of columns that uniquely identifies each row in a table and cannot contain NULL values", "Any column that contains numeric integers", "An encryption key used to secure passwords", "A key that links to an external database table"],
                "answer": "A column or set of columns that uniquely identifies each row in a table and cannot contain NULL values",
                "topic": "Relational Model"
            },
            {
                "text": "What is a Foreign Key in relational database design?",
                "options": ["A field in one table that references the primary key of another table, enforcing referential integrity", "A key generated by external third-party APIs", "A key that cannot be indexed", "A temporary key generated during search queries"],
                "answer": "A field in one table that references the primary key of another table, enforcing referential integrity",
                "topic": "Referential Integrity"
            }
        ],
        2: [
            {
                "text": "What is Database Normalization and what is its primary goal?",
                "options": ["Organizing table schemas to minimize data redundancy and prevent insertion, update, and deletion anomalies", "Converting SQL queries into JSON format", "Backing up database tables to cloud storage", "Creating duplicate tables for faster backups"],
                "answer": "Organizing table schemas to minimize data redundancy and prevent insertion, update, and deletion anomalies",
                "topic": "Normalization"
            },
            {
                "text": "What condition must a relation satisfy to achieve Third Normal Form (3NF)?",
                "options": ["It must be in 2NF and have no transitive functional dependencies of non-prime attributes on the primary key", "It must have at least three tables", "It must use 3 foreign keys per table", "All columns must contain JSON arrays"],
                "answer": "It must be in 2NF and have no transitive functional dependencies of non-prime attributes on the primary key",
                "topic": "Normal Forms"
            },
            {
                "text": "What is the difference between DDL (Data Definition Language) and DML (Data Manipulation Language)?",
                "options": ["DDL defines structure (CREATE, ALTER, DROP); DML manipulates data (INSERT, UPDATE, DELETE)", "DML defines structure; DDL queries data", "DDL is used in NoSQL; DML is used in SQL", "There is no difference"],
                "answer": "DDL defines structure (CREATE, ALTER, DROP); DML manipulates data (INSERT, UPDATE, DELETE)",
                "topic": "SQL Language Subsets"
            }
        ],
        3: [
            {
                "text": "How does a B+ Tree index differ from a standard binary search tree for database storage engines?",
                "options": ["B+ Trees have high fan-out (reducing disk I/O depth) with all keys stored in linked leaf nodes, making range queries extremely fast", "B+ Trees can only store 2 keys per node", "B+ Trees are stored in memory and lost on reboot", "Binary trees have faster disk access than B+ trees"],
                "answer": "B+ Trees have high fan-out (reducing disk I/O depth) with all keys stored in linked leaf nodes, making range queries extremely fast",
                "topic": "Indexing & Storage"
            },
            {
                "text": "What is the difference between a Clustered Index and a Non-Clustered Index?",
                "options": ["A clustered index defines the physical order of data rows on disk (only 1 per table); a non-clustered index stores a separate lookup structure with pointers", "A non-clustered index physically sorts the table; clustered does not", "Tables can have 100 clustered indexes", "Clustered indexes only work on text columns"],
                "answer": "A clustered index defines the physical order of data rows on disk (only 1 per table); a non-clustered index stores a separate lookup structure with pointers",
                "topic": "Indexes"
            },
            {
                "text": "What is the purpose of the Write-Ahead Logging (WAL) protocol in database management systems?",
                "options": ["Ensures changes are written to append-only disk log files before being flushed to database data pages, guaranteeing Durability on crash recovery", "Logs user passwords before authenticating", "Writes queries to an audit log for security compliance", "Logs deleted files for 30 days"],
                "answer": "Ensures changes are written to append-only disk log files before being flushed to database data pages, guaranteeing Durability on crash recovery",
                "topic": "Transaction Logging & WAL"
            }
        ],
        4: [
            {
                "text": "What are the four standard ANSI SQL Transaction Isolation Levels in increasing order of isolation?",
                "options": ["Read Uncommitted -> Read Committed -> Repeatable Read -> Serializable", "Read Committed -> Read Uncommitted -> Serializable -> Repeatable Read", "Serializable -> Read Committed -> Repeatable Read -> Snapshot", "None -> Fast -> Medium -> Strict"],
                "answer": "Read Uncommitted -> Read Committed -> Repeatable Read -> Serializable",
                "topic": "Isolation Levels"
            },
            {
                "text": "What is a 'Phantom Read' anomaly in database transactions?",
                "options": ["When a transaction queries a range of rows twice and discovers new rows inserted by another committed transaction in between", "Reading uncommitted data that is later rolled back", "Reading different values for the same single row in two reads", "A hardware reading failure"],
                "answer": "When a transaction queries a range of rows twice and discovers new rows inserted by another committed transaction in between",
                "topic": "Concurrency Anomalies"
            },
            {
                "text": "What is the Two-Phase Locking (2PL) protocol and what does it guarantee?",
                "options": ["Transactions acquire all locks in a growing phase and release them in a shrinking phase, guaranteeing Conflict Serializability", "Transactions lock two tables at a time", "A protocol for two-node database replication", "Prevents all deadlocks automatically without aborts"],
                "answer": "Transactions acquire all locks in a growing phase and release them in a shrinking phase, guaranteeing Conflict Serializability",
                "topic": "Concurrency Control"
            }
        ],
        5: [
            {
                "text": "How does Multi-Version Concurrency Control (MVCC) eliminate read-write blocking in modern databases like PostgreSQL?",
                "options": ["Readers do not block writers and writers do not block readers; each transaction reads a consistent snapshot version of data via transaction IDs (xmin/xmax)", "By converting all write transactions into asynchronous message queues", "By forcing all queries to run on read-only replicas", "By acquiring global table locks for every transaction"],
                "answer": "Readers do not block writers and writers do not block readers; each transaction reads a consistent snapshot version of data via transaction IDs (xmin/xmax)",
                "topic": "MVCC Internals"
            },
            {
                "text": "In distributed databases, what does the CAP Theorem state?",
                "options": ["A distributed system can guarantee at most two out of Consistency, Availability, and Partition Tolerance simultaneously", "Databases cannot scale beyond 1000 nodes", "Consistency and Availability are mutually exclusive in all architectures", "Cloud databases must support ACID and BASE simultaneously"],
                "answer": "A distributed system can guarantee at most two out of Consistency, Availability, and Partition Tolerance simultaneously",
                "topic": "Distributed Systems & CAP"
            },
            {
                "text": "What is an LSM-Tree (Log-Structured Merge-tree) and why is it preferred over B+ Trees in write-heavy storage engines (like Cassandra, RocksDB)?",
                "options": ["Writes are sequentially appended to an in-memory memtable and flushed to immutable SSTables, converting random disk writes into high-throughput sequential writes", "It uses in-memory hash tables that never write to disk", "It stores data in binary trees balanced every 1 second", "It is only used for caching read queries"],
                "answer": "Writes are sequentially appended to an in-memory memtable and flushed to immutable SSTables, converting random disk writes into high-throughput sequential writes",
                "topic": "Storage Engines & LSM"
            }
        ]
    },

    "SQL": {
        1: [
            {
                "text": "Which SQL clause is used to filter rows returned by a `SELECT` statement based on specified conditions?",
                "options": ["WHERE", "ORDER BY", "GROUP BY", "HAVING"],
                "answer": "WHERE",
                "topic": "Filtering"
            },
            {
                "text": "What is the difference between `INNER JOIN` and `LEFT JOIN` in SQL?",
                "options": ["INNER JOIN returns rows matching in both tables; LEFT JOIN returns all rows from the left table and matched rows from the right", "LEFT JOIN returns only matching rows; INNER JOIN returns all rows", "Both return identical rows with different column orders", "INNER JOIN can only be used with primary keys"],
                "answer": "INNER JOIN returns rows matching in both tables; LEFT JOIN returns all rows from the left table and matched rows from the right",
                "topic": "Joins"
            },
            {
                "text": "Which SQL aggregate function calculates the total sum of values in a numeric column?",
                "options": ["SUM()", "COUNT()", "AVG()", "TOTAL()"],
                "answer": "SUM()",
                "topic": "Aggregate Functions"
            }
        ],
        2: [
            {
                "text": "What is the difference between `WHERE` and `HAVING` clauses in SQL?",
                "options": ["`WHERE` filters rows before grouping; `HAVING` filters grouped data after `GROUP BY` aggregation", "`HAVING` filters before grouping; `WHERE` filters after", "Both can be used interchangeably in all queries", "`HAVING` can only be used with subqueries"],
                "answer": "`WHERE` filters rows before grouping; `HAVING` filters grouped data after `GROUP BY` aggregation",
                "topic": "Grouping & Filtering"
            },
            {
                "text": "What is the difference between `UNION` and `UNION ALL` in SQL?",
                "options": ["`UNION` removes duplicate rows; `UNION ALL` retains all duplicates and is faster", "`UNION ALL` removes duplicates; `UNION` retains them", "`UNION` sorts rows in descending order; `UNION ALL` does not", "There is no difference"],
                "answer": "`UNION` removes duplicate rows; `UNION ALL` retains all duplicates and is faster",
                "topic": "Set Operations"
            },
            {
                "text": "What does `SELECT DISTINCT column FROM table` return?",
                "options": ["All unique, non-duplicate values from the specified column", "All rows sorted alphabetically", "Only the first 10 rows of the table", "The highest numerical value in the column"],
                "answer": "All unique, non-duplicate values from the specified column",
                "topic": "Distinct Values"
            }
        ],
        3: [
            {
                "text": "What is a Common Table Expression (CTE) in SQL defined with the `WITH` clause?",
                "options": ["A named temporary result set available within the execution scope of a single SELECT, INSERT, UPDATE, or DELETE query", "A permanent view stored in the database catalog", "A temporary table stored on disk until connection closes", "A stored procedure compiled in C"],
                "answer": "A named temporary result set available within the execution scope of a single SELECT, INSERT, UPDATE, or DELETE query",
                "topic": "CTEs"
            },
            {
                "text": "What is the difference between `RANK()` and `DENSE_RANK()` window functions in SQL when ties occur?",
                "options": ["`RANK()` skips subsequent rank numbers after ties (e.g. 1, 2, 2, 4); `DENSE_RANK()` does not skip rank numbers (e.g. 1, 2, 2, 3)", "`DENSE_RANK()` skips ranks; `RANK()` does not", "`RANK()` returns floating point numbers; `DENSE_RANK()` returns integers", "Both produce identical sequential numbers"],
                "answer": "`RANK()` skips subsequent rank numbers after ties (e.g. 1, 2, 2, 4); `DENSE_RANK()` does not skip rank numbers (e.g. 1, 2, 2, 3)",
                "topic": "Window Functions"
            },
            {
                "text": "What does the `COALESCE(val1, val2, val3)` function do in SQL?",
                "options": ["Returns the first non-null argument in the given list", "Returns the highest numeric value", "Concatenates all strings together", "Converts values to uppercase"],
                "answer": "Returns the first non-null argument in the given list",
                "topic": "Null Handling"
            }
        ],
        4: [
            {
                "text": "What is an SQL Correlated Subquery and why can it have severe performance implications?",
                "options": ["A subquery that references columns from the outer query, evaluating once for every single candidate row processed by the outer query", "A subquery that runs on a separate database server", "A subquery that creates temporary tables on disk", "A query that returns multiple columns"],
                "answer": "A subquery that references columns from the outer query, evaluating once for every single candidate row processed by the outer query",
                "topic": "Subqueries & Optimization"
            },
            {
                "text": "What is a Covering Index in SQL query optimization?",
                "options": ["An index that includes all columns referenced by a query (SELECT, WHERE, JOIN), allowing the database engine to satisfy the query entirely from the index without table lookups", "An index that covers the entire table rows in disk", "An index that is updated only once per week", "A primary key index"],
                "answer": "An index that includes all columns referenced by a query (SELECT, WHERE, JOIN), allowing the database engine to satisfy the query entirely from the index without table lookups",
                "topic": "Query Optimization"
            },
            {
                "text": "What is the difference between `EXPLAIN` and `EXPLAIN ANALYZE` in SQL engines like PostgreSQL?",
                "options": ["`EXPLAIN` shows the cost-based query plan without executing; `EXPLAIN ANALYZE` actually executes the query and reports true runtime durations and row counts", "`EXPLAIN ANALYZE` does not run the query", "`EXPLAIN` modifies table schema", "Both produce the exact same text"],
                "answer": "`EXPLAIN` shows the cost-based query plan without executing; `EXPLAIN ANALYZE` actually executes the query and reports true runtime durations and row counts",
                "topic": "Execution Plans"
            }
        ],
        5: [
            {
                "text": "In SQL query execution engines, when does the optimizer choose a Hash Join over a Nested Loop Join or Merge Join?",
                "options": ["When joining large tables on equi-join predicates without usable indexes, building an in-memory hash table on the smaller relation and probing with the larger", "When joining tables on greater-than (>) inequalities", "When tables contain fewer than 5 rows", "When tables are already physically sorted on disk"],
                "answer": "When joining large tables on equi-join predicates without usable indexes, building an in-memory hash table on the smaller relation and probing with the larger",
                "topic": "Join Algorithms & Execution"
            },
            {
                "text": "How do Recursive Common Table Expressions (Recursive CTEs) evaluate termination conditions to prevent infinite loops?",
                "options": ["Evaluates an Anchor Member once, then repeatedly executes the Recursive Member using the working table from the previous iteration until it returns an empty result set", "By checking a 10-second timeout automatically", "By limiting recursion depth strictly to 10 rows", "Using database triggers on each row"],
                "answer": "Evaluates an Anchor Member once, then repeatedly executes the Recursive Member using the working table from the previous iteration until it returns an empty result set",
                "topic": "Recursive CTEs"
            },
            {
                "text": "What is Table Partitioning (Range/List/Hash) in enterprise SQL and how does Partition Pruning boost query speeds?",
                "options": ["Splits large tables into smaller physical chunks; the query planner skips scanning partitions whose constraints cannot match the WHERE filter", "Encrypts individual database tables on separate disks", "Converts relational tables into Redis caches", "Deletes old records every night"],
                "answer": "Splits large tables into smaller physical chunks; the query planner skips scanning partitions whose constraints cannot match the WHERE filter",
                "topic": "Partitioning & Pruning"
            }
        ]
    }
}

# Coding Sandbox Problems for all 11 skills (Difficulty 4: Practical Sandbox, Difficulty 5: Advanced/Design Sandbox)
CODING_DATA = {
    "Python": [
        {
            "difficulty": 4,
            "text": "Write a Python function `find_first_unique_char(s: str) -> int` that takes a string `s` and returns the 0-based index of the first non-repeating character. If no unique character exists, return -1.\n\n### Examples:\n- `find_first_unique_char('leetcode')` -> `0`\n- `find_first_unique_char('loveleetcode')` -> `2`\n- `find_first_unique_char('aabb')` -> `-1`",
            "starter": "def find_first_unique_char(s: str) -> int:\n    # Your solution here\n    pass\n",
            "answer": "def find_first_unique_char(s: str) -> int:\n    counts = {}\n    for c in s:\n        counts[c] = counts.get(c, 0) + 1\n    for i, c in enumerate(s):\n        if counts[c] == 1:\n            return i\n    return -1",
            "topic": "String Manipulation"
        },
        {
            "difficulty": 5,
            "text": "Implement an LRU (Least Recently Used) Cache class `LRUCache` with `get(key)` and `put(key, value)` methods. Both operations must run in O(1) average time complexity.\n\n### Requirements:\n- `__init__(self, capacity: int)`: Initialize cache with positive capacity.\n- `get(self, key: int) -> int`: Return value of key if exists, else -1.\n- `put(self, key: int, value: int) -> None`: Update value or insert key. If capacity exceeded, evict the least recently used key.",
            "starter": "from collections import OrderedDict\n\nclass LRUCache:\n    def __init__(self, capacity: int):\n        # Your initialization here\n        pass\n\n    def get(self, key: int) -> int:\n        # Your logic here\n        pass\n\n    def put(self, key: int, value: int) -> None:\n        # Your logic here\n        pass\n",
            "answer": "from collections import OrderedDict\n\nclass LRUCache:\n    def __init__(self, capacity: int):\n        self.capacity = capacity\n        self.cache = OrderedDict()\n\n    def get(self, key: int) -> int:\n        if key not in self.cache:\n            return -1\n        self.cache.move_to_end(key)\n        return self.cache[key]\n\n    def put(self, key: int, value: int) -> None:\n        if key in self.cache:\n            self.cache.move_to_end(key)\n        self.cache[key] = value\n        if len(self.cache) > self.capacity:\n            self.cache.popitem(last=False)",
            "topic": "Data Structures & LRU"
        }
    ],

    "C++": [
        {
            "difficulty": 4,
            "text": "Write a C++ function `bool isPalindrome(const std::string& s)` that checks if a string is a palindrome, considering only alphanumeric characters and ignoring cases.\n\n### Examples:\n- `isPalindrome(\"A man, a plan, a canal: Panama\")` -> `true`\n- `isPalindrome(\"race a car\")` -> `false`",
            "starter": "#include <string>\n#include <cctype>\n\nbool isPalindrome(const std::string& s) {\n    // Write your solution here\n    return false;\n}\n",
            "answer": "#include <string>\n#include <cctype>\n\nbool isPalindrome(const std::string& s) {\n    int l = 0, r = s.size() - 1;\n    while (l < r) {\n        while (l < r && !std::isalnum(s[l])) l++;\n        while (l < r && !std::isalnum(s[r])) r--;\n        if (std::tolower(s[l]) != std::tolower(s[r])) return false;\n        l++; r--;\n    }\n    return true;\n}",
            "topic": "String Pointers"
        },
        {
            "difficulty": 5,
            "text": "Implement a custom Smart Pointer template class `UniquePtr<T>` in C++ that manages a dynamic pointer exclusively and deletes the resource in its destructor.\n\n### Requirements:\n- Disable copy constructor and copy assignment operator (`= delete`).\n- Implement move constructor and move assignment operator transferring ownership.\n- Implement dereference operators `operator*` and `operator->`.",
            "starter": "template<typename T>\nclass UniquePtr {\nprivate:\n    T* ptr;\npublic:\n    explicit UniquePtr(T* p = nullptr) : ptr(p) {}\n    ~UniquePtr() { delete ptr; }\n\n    // Disable copy\n    UniquePtr(const UniquePtr&) = delete;\n    UniquePtr& operator=(const UniquePtr&) = delete;\n\n    // Implement move constructor & move assignment\n    UniquePtr(UniquePtr&& other) noexcept {\n        // Your code here\n    }\n    UniquePtr& operator=(UniquePtr&& other) noexcept {\n        // Your code here\n        return *this;\n    }\n\n    T& operator*() const { return *ptr; }\n    T* operator->() const { return ptr; }\n};\n",
            "answer": "template<typename T>\nclass UniquePtr {\nprivate:\n    T* ptr;\npublic:\n    explicit UniquePtr(T* p = nullptr) : ptr(p) {}\n    ~UniquePtr() { delete ptr; }\n    UniquePtr(const UniquePtr&) = delete;\n    UniquePtr& operator=(const UniquePtr&) = delete;\n    UniquePtr(UniquePtr&& other) noexcept : ptr(other.ptr) { other.ptr = nullptr; }\n    UniquePtr& operator=(UniquePtr&& other) noexcept {\n        if (this != &other) {\n            delete ptr;\n            ptr = other.ptr;\n            other.ptr = nullptr;\n        }\n        return *this;\n    }\n    T& operator*() const { return *ptr; }\n    T* operator->() const { return ptr; }\n};",
            "topic": "RAII & Smart Pointers"
        }
    ],

    "Java": [
        {
            "difficulty": 4,
            "text": "Write a Java method `public static boolean isValidParentheses(String s)` that determines if the input string containing `'(', ')', '{', '}', '[', ']'` has valid matching brackets in correct order.",
            "starter": "import java.util.Stack;\n\npublic class Solution {\n    public static boolean isValidParentheses(String s) {\n        // Write your solution here\n        return false;\n    }\n}\n",
            "answer": "import java.util.Stack;\n\npublic class Solution {\n    public static boolean isValidParentheses(String s) {\n        Stack<Character> stack = new Stack<>();\n        for (char c : s.toCharArray()) {\n            if (c == '(') stack.push(')');\n            else if (c == '{') stack.push('}');\n            else if (c == '[') stack.push(']');\n            else if (stack.isEmpty() || stack.pop() != c) return false;\n        }\n        return stack.isEmpty();\n    }\n}",
            "topic": "Stack & Parsing"
        },
        {
            "difficulty": 5,
            "text": "Implement a thread-safe Bounded Blocking Queue in Java with `put(item)` and `take()` methods using `ReentrantLock` and `Condition`.\n\n### Requirements:\n- `put(T item)`: Blocks if queue is full until space becomes available.\n- `take()`: Blocks if queue is empty until an item is available.",
            "starter": "import java.util.LinkedList;\nimport java.util.Queue;\nimport java.util.concurrent.locks.*;\n\npublic class BoundedBlockingQueue<T> {\n    private final Queue<T> queue = new LinkedList<>();\n    private final int capacity;\n    private final Lock lock = new ReentrantLock();\n    private final Condition notFull = lock.newCondition();\n    private final Condition notEmpty = lock.newCondition();\n\n    public BoundedBlockingQueue(int capacity) {\n        this.capacity = capacity;\n    }\n\n    public void put(T item) throws InterruptedException {\n        // Implement thread-safe put\n    }\n\n    public T take() throws InterruptedException {\n        // Implement thread-safe take\n        return null;\n    }\n}\n",
            "answer": "import java.util.LinkedList;\nimport java.util.Queue;\nimport java.util.concurrent.locks.*;\n\npublic class BoundedBlockingQueue<T> {\n    private final Queue<T> queue = new LinkedList<>();\n    private final int capacity;\n    private final Lock lock = new ReentrantLock();\n    private final Condition notFull = lock.newCondition();\n    private final Condition notEmpty = lock.newCondition();\n\n    public BoundedBlockingQueue(int capacity) {\n        this.capacity = capacity;\n    }\n\n    public void put(T item) throws InterruptedException {\n        lock.lock();\n        try {\n            while (queue.size() == capacity) notFull.await();\n            queue.add(item);\n            notEmpty.signal();\n        } finally {\n            lock.unlock();\n        }\n    }\n\n    public T take() throws InterruptedException {\n        lock.lock();\n        try {\n            while (queue.isEmpty()) notEmpty.await();\n            T item = queue.poll();\n            notFull.signal();\n            return item;\n        } finally {\n            lock.unlock();\n        }\n    }\n}",
            "topic": "Concurrency & Locks"
        }
    ],

    "JavaScript": [
        {
            "difficulty": 4,
            "text": "Write a JavaScript function `deepClone(obj)` that produces a complete deep copy of nested objects and arrays without referencing the original object instances.",
            "starter": "function deepClone(obj) {\n  // Write your solution here\n}\n",
            "answer": "function deepClone(obj) {\n  if (obj === null || typeof obj !== 'object') return obj;\n  if (Array.isArray(obj)) return obj.map(deepClone);\n  const copy = {};\n  for (const key of Object.keys(obj)) {\n    copy[key] = deepClone(obj[key]);\n  }\n  return copy;\n}",
            "topic": "Object Recursion"
        },
        {
            "difficulty": 5,
            "text": "Implement a `debounce(fn, delay)` function in JavaScript that returns a debounced version of `fn`. Also support a `.cancel()` method to clear pending executions.",
            "starter": "function debounce(fn, delay) {\n  // Write debounced wrapper here\n}\n",
            "answer": "function debounce(fn, delay) {\n  let timer = null;\n  function debounced(...args) {\n    if (timer) clearTimeout(timer);\n    timer = setTimeout(() => {\n      fn.apply(this, args);\n    }, delay);\n  }\n  debounced.cancel = () => {\n    if (timer) clearTimeout(timer);\n    timer = null;\n  };\n  return debounced;\n}",
            "topic": "Functional Programming & Timers"
        }
    ],

    "Docker": [
        {
            "difficulty": 4,
            "text": "Write a production-ready, multi-stage `Dockerfile` for a Node.js web application.\n\n### Requirements:\n- Stage 1 ('builder'): Use `node:20-alpine`, copy `package*.json`, run `npm ci`, copy source code, run `npm run build`.\n- Stage 2 ('runner'): Use `node:20-alpine`, set `NODE_ENV=production`, copy only production `node_modules` and built files from builder, run as non-root user `node`, expose port 3000, and define `CMD [\"node\", \"dist/index.js\"]`.",
            "starter": "# Stage 1: Build\nFROM node:20-alpine AS builder\n# Add your build commands here\n\n# Stage 2: Production Runner\nFROM node:20-alpine AS runner\n# Add your minimal runtime commands here\n",
            "answer": "FROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine AS runner\nWORKDIR /app\nENV NODE_ENV=production\nCOPY --from=builder /app/package*.json ./\nCOPY --from=builder /app/node_modules ./node_modules\nCOPY --from=builder /app/dist ./dist\nUSER node\nEXPOSE 3000\nCMD [\"node\", \"dist/index.js\"]",
            "topic": "Production Dockerfile"
        },
        {
            "difficulty": 5,
            "text": "Write a `docker-compose.yml` configuration defining a full-stack stack with two services: a Node API and a Postgres database.\n\n### Requirements:\n- `db`: Uses `postgres:16-alpine`, sets environment variables (`POSTGRES_DB=app`, `POSTGRES_USER=admin`, `POSTGRES_PASSWORD=secret`), and mounts a named volume `pgdata` to `/var/lib/postgresql/data`.\n- `api`: Builds from `.`, depends on `db` with `condition: service_healthy` or standard depends_on, maps port `4000:4000`, and passes `DATABASE_URL`.\n- Named volumes section declaring `pgdata`.",
            "starter": "version: '3.8'\nservices:\n  # Define db and api services\nvolumes:\n  # Define volumes\n",
            "answer": "version: '3.8'\nservices:\n  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_DB: app\n      POSTGRES_USER: admin\n      POSTGRES_PASSWORD: secret\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -U admin -d app\"]\n      interval: 5s\n      retries: 5\n\n  api:\n    build: .\n    ports:\n      - \"4000:4000\"\n    depends_on:\n      db:\n        condition: service_healthy\n    environment:\n      DATABASE_URL: postgres://admin:secret@db:5432/app\n\nvolumes:\n  pgdata:",
            "topic": "Docker Compose Orchestration"
        }
    ],

    "HTML": [
        {
            "difficulty": 4,
            "text": "Write clean, semantic HTML5 markup for an accessible contact form containing: a Full Name input, an Email input, a Category select dropdown, a Message textarea, and a Submit button. Include proper `<label>` elements linked via `for`/`id` and required attributes.",
            "starter": "<form action=\"/submit\" method=\"POST\">\n  <!-- Build accessible form fields here -->\n</form>\n",
            "answer": "<form action=\"/submit\" method=\"POST\">\n  <div>\n    <label for=\"name\">Full Name:</label>\n    <input type=\"text\" id=\"name\" name=\"name\" required />\n  </div>\n  <div>\n    <label for=\"email\">Email Address:</label>\n    <input type=\"email\" id=\"email\" name=\"email\" required />\n  </div>\n  <div>\n    <label for=\"category\">Inquiry Category:</label>\n    <select id=\"category\" name=\"category\" required>\n      <option value=\"support\">Technical Support</option>\n      <option value=\"billing\">Billing</option>\n      <option value=\"general\">General Inquiry</option>\n    </select>\n  </div>\n  <div>\n    <label for=\"message\">Message:</label>\n    <textarea id=\"message\" name=\"message\" rows=\"4\" required></textarea>\n  </div>\n  <button type=\"submit\">Send Message</button>\n</form>",
            "topic": "Accessible Form Markup"
        },
        {
            "difficulty": 5,
            "text": "Write the HTML markup and inline JavaScript to create a reusable native Web Component `<user-card>` using Custom Elements and Shadow DOM that displays an avatar image, a name heading, and an email slot.",
            "starter": "<script>\n  class UserCard extends HTMLElement {\n    constructor() {\n      super();\n      // Attach shadow DOM and render template\n    }\n  }\n  customElements.define('user-card', UserCard);\n</script>\n\n<!-- Usage example -->\n<user-card></user-card>\n",
            "answer": "<script>\n  class UserCard extends HTMLElement {\n    constructor() {\n      super();\n      const shadow = this.attachShadow({ mode: 'open' });\n      shadow.innerHTML = `\n        <style>\n          .card { border: 1px solid #ccc; padding: 16px; border-radius: 8px; font-family: sans-serif; }\n          h3 { margin: 0 0 8px; color: #333; }\n        </style>\n        <div class=\"card\">\n          <h3><slot name=\"name\">Default User</slot></h3>\n          <p><slot name=\"email\">user@example.com</slot></p>\n        </div>\n      `;\n    }\n  }\n  customElements.define('user-card', UserCard);\n</script>",
            "topic": "Custom Elements & Shadow DOM"
        }
    ],

    "CSS": [
        {
            "difficulty": 4,
            "text": "Write CSS styles to center a child `.modal-box` both vertically and horizontally inside a parent `.modal-overlay` container using CSS Flexbox. Also ensure the overlay covers the full viewport with a semi-transparent dark background.",
            "starter": ".modal-overlay {\n  /* Center child modal and cover viewport */\n}\n\n.modal-box {\n  /* Modal box styling */\n}\n",
            "answer": ".modal-overlay {\n  position: fixed;\n  inset: 0;\n  background-color: rgba(0, 0, 0, 0.5);\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  z-index: 1000;\n}\n\n.modal-box {\n  background: #ffffff;\n  padding: 24px;\n  border-radius: 8px;\n  max-width: 500px;\n  width: 90%;\n}",
            "topic": "Flexbox Centering"
        },
        {
            "difficulty": 5,
            "text": "Write a responsive CSS Grid layout for a dashboard `.dashboard-grid` that features auto-fitting columns with a minimum width of `280px` and maximum `1fr`, with a `1.5rem` gap, adapting smoothly across screen sizes without media queries.",
            "starter": ".dashboard-grid {\n  /* Implement responsive auto-fit grid */\n}\n",
            "answer": ".dashboard-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: 1.5rem;\n  padding: 1.5rem;\n}",
            "topic": "CSS Grid Auto-Fit"
        }
    ],

    "C": [
        {
            "difficulty": 4,
            "text": "Write a C function `void reverseString(char* s)` that reverses a null-terminated C string in-place without using library functions.",
            "starter": "#include <stdio.h>\n\nvoid reverseString(char* s) {\n    // Implement in-place reversal\n}\n",
            "answer": "#include <stdio.h>\n\nvoid reverseString(char* s) {\n    if (!s) return;\n    int len = 0;\n    while (s[len] != '\\0') len++;\n    int l = 0, r = len - 1;\n    while (l < r) {\n        char tmp = s[l];\n        s[l] = s[r];\n        s[r] = tmp;\n        l++; r--;\n    }\n}",
            "topic": "Pointers & String Manipulation"
        },
        {
            "difficulty": 5,
            "text": "Implement a dynamically resizing integer vector in C with `void init_vector(Vector* v)`, `void push_back(Vector* v, int val)`, and `void free_vector(Vector* v)`.\n\n### Requirements:\n- Automatically double the capacity with `realloc()` when size equals capacity.",
            "starter": "#include <stdlib.h>\n\ntypedef struct {\n    int* data;\n    size_t size;\n    size_t capacity;\n} Vector;\n\nvoid init_vector(Vector* v) {\n    // Initialize with capacity 4\n}\n\nvoid push_back(Vector* v, int val) {\n    // Append element and grow capacity if needed\n}\n\nvoid free_vector(Vector* v) {\n    // Clean up heap memory\n}\n",
            "answer": "#include <stdlib.h>\n\ntypedef struct {\n    int* data;\n    size_t size;\n    size_t capacity;\n} Vector;\n\nvoid init_vector(Vector* v) {\n    v->size = 0;\n    v->capacity = 4;\n    v->data = (int*)malloc(v->capacity * sizeof(int));\n}\n\nvoid push_back(Vector* v, int val) {\n    if (v->size == v->capacity) {\n        v->capacity *= 2;\n        v->data = (int*)realloc(v->data, v->capacity * sizeof(int));\n    }\n    v->data[v->size++] = val;\n}\n\nvoid free_vector(Vector* v) {\n    free(v->data);\n    v->data = NULL;\n    v->size = 0;\n    v->capacity = 0;\n}",
            "topic": "Dynamic Memory & Data Structures"
        }
    ],

    "Operating Systems": [
        {
            "difficulty": 4,
            "text": "Write a conceptual Python simulation or algorithm demonstrating the Producer-Consumer pattern using a shared bounded queue and `threading.Semaphore` / `threading.Lock` to prevent buffer overflow and underflow.",
            "starter": "import threading\nimport time\n\nBUFFER_SIZE = 5\nbuffer = []\n\n# Define mutex and semaphores here\n\ndef producer(item):\n    # Wait for empty slot and append item\n    pass\n\ndef consumer():\n    # Wait for full slot and remove item\n    pass\n",
            "answer": "import threading\n\nBUFFER_SIZE = 5\nbuffer = []\n\nempty_slots = threading.Semaphore(BUFFER_SIZE)\nfull_slots = threading.Semaphore(0)\nmutex = threading.Lock()\n\ndef producer(item):\n    empty_slots.acquire()\n    with mutex:\n        buffer.append(item)\n    full_slots.release()\n\ndef consumer():\n    full_slots.acquire()\n    with mutex:\n        item = buffer.pop(0)\n    empty_slots.release()\n    return item",
            "topic": "Process Synchronization"
        },
        {
            "difficulty": 5,
            "text": "Outline an architectural implementation of the Least Recently Used (LRU) Page Replacement Algorithm in an OS kernel memory manager that tracks 4 physical frames. Given a page reference stream `[1, 2, 3, 4, 1, 5, 2]`, write the algorithm that records page hits and faults.",
            "starter": "def simulate_lru_paging(pages, frame_count=4):\n    # Return total_faults and final frames\n    pass\n",
            "answer": "def simulate_lru_paging(pages, frame_count=4):\n    frames = []\n    faults = 0\n    for p in pages:\n        if p in frames:\n            frames.remove(p)\n            frames.append(p)\n        else:\n            faults += 1\n            if len(frames) == frame_count:\n                frames.pop(0)\n            frames.append(p)\n    return faults, frames",
            "topic": "Page Replacement Algorithms"
        }
    ],

    "DBMS": [
        {
            "difficulty": 4,
            "text": "Write an architectural SQL schema definition demonstrating 3NF (Third Normal Form) for an E-commerce system with `customers`, `orders`, and `order_items` tables with appropriate primary and foreign key constraints.",
            "starter": "-- Design 3NF normalized tables for customers, orders, and order_items\n",
            "answer": "CREATE TABLE customers (\n    customer_id SERIAL PRIMARY KEY,\n    email VARCHAR(255) UNIQUE NOT NULL,\n    full_name VARCHAR(100) NOT NULL\n);\n\nCREATE TABLE orders (\n    order_id SERIAL PRIMARY KEY,\n    customer_id INT REFERENCES customers(customer_id) ON DELETE CASCADE,\n    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    total_amount DECIMAL(10,2) NOT NULL\n);\n\nCREATE TABLE order_items (\n    item_id SERIAL PRIMARY KEY,\n    order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,\n    product_id INT NOT NULL,\n    quantity INT CHECK (quantity > 0),\n    unit_price DECIMAL(10,2) NOT NULL\n);",
            "topic": "Relational Schema Design"
        },
        {
            "difficulty": 5,
            "text": "Write a SQL stored procedure or transaction script in PostgreSQL that transfers funds (`transfer_amount`) safely between two accounts (`from_id`, `to_id`), ensuring ACID semantics and balance checks.",
            "starter": "CREATE OR REPLACE PROCEDURE transfer_funds(\n    from_account INT,\n    to_account INT,\n    amount DECIMAL(10,2)\n)\nLANGUAGE plpgsql\nAS $$\nBEGIN\n    -- Implement atomic balance check and transfer\nEND;\n$$;\n",
            "answer": "CREATE OR REPLACE PROCEDURE transfer_funds(\n    from_account INT,\n    to_account INT,\n    amount DECIMAL(10,2)\n)\nLANGUAGE plpgsql\nAS $$\nDECLARE\n    current_bal DECIMAL(10,2);\nBEGIN\n    SELECT balance INTO current_bal FROM accounts WHERE id = from_account FOR UPDATE;\n    IF current_bal < amount THEN\n        RAISE EXCEPTION 'Insufficient funds';\n    END IF;\n    UPDATE accounts SET balance = balance - amount WHERE id = from_account;\n    UPDATE accounts SET balance = balance + amount WHERE id = to_account;\n    COMMIT;\nEND;\n$$;",
            "topic": "ACID Transactions"
        }
    ],

    "SQL": [
        {
            "difficulty": 4,
            "text": "Write a SQL query using a Window Function to find the 2nd highest salary from an `employees (id, name, department_id, salary)` table for each department.",
            "starter": "-- Query returning department_id, employee_name, salary for 2nd highest salary\n",
            "answer": "WITH RankedSalaries AS (\n    SELECT \n        department_id,\n        name,\n        salary,\n        DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) as salary_rank\n    FROM employees\n)\nSELECT department_id, name, salary\nFROM RankedSalaries\nWHERE salary_rank = 2;",
            "topic": "Window Functions & Ranking"
        },
        {
            "difficulty": 5,
            "text": "Write a Recursive Common Table Expression (CTE) query in SQL to find the complete organizational reporting hierarchy starting from the CEO down to all direct and indirect reportees in an `employees(id, name, manager_id)` table.",
            "starter": "-- Recursive CTE to get full employee hierarchy\nWITH RECURSIVE OrgHierarchy AS (\n    -- Anchor member (CEO: manager_id IS NULL)\n\n    -- UNION ALL\n\n    -- Recursive member\n)\nSELECT * FROM OrgHierarchy;\n",
            "answer": "WITH RECURSIVE OrgHierarchy AS (\n    SELECT id, name, manager_id, 1 as level\n    FROM employees\n    WHERE manager_id IS NULL\n    \n    UNION ALL\n    \n    SELECT e.id, e.name, e.manager_id, o.level + 1\n    FROM employees e\n    INNER JOIN OrgHierarchy o ON e.manager_id = o.id\n)\nSELECT id, name, manager_id, level\nFROM OrgHierarchy\nORDER BY level, id;",
            "topic": "Recursive CTE"
        }
    ]
}

def seed_all():
    print("====================================================")
    print("STARTING COMPREHENSIVE ASSESSMENT PRELOAD SEEDER")
    print("====================================================")
    
    # 1. Fetch existing question fingerprints to avoid duplicates
    existing_mcqs = supabase.table("questions").select("id, question_base_text, skill_name, difficulty_level").execute()
    existing_mcq_texts = set(r["question_base_text"].strip() for r in (existing_mcqs.data or []))
    print(f"Existing MCQs in DB: {len(existing_mcq_texts)}")

    existing_codings = supabase.table("coding_questions").select("id, question_base_text, skill_name").execute()
    existing_coding_texts = set(r["question_base_text"].strip() for r in (existing_codings.data or []))
    print(f"Existing Coding questions in DB: {len(existing_coding_texts)}")

    mcq_insert_rows = []
    coding_insert_rows = []

    # Map of skills and alias variations to seed so both uppercase & lowercase match instantly
    alias_map = {
        "Python": ["Python"],
        "C++": ["C++", "cpp"],
        "Java": ["Java"],
        "JavaScript": ["JavaScript", "javascript", "js", "JS"],
        "Docker": ["Docker", "docker"],
        "HTML": ["HTML", "html"],
        "CSS": ["CSS", "css"],
        "C": ["C", "c"],
        "Operating Systems": ["Operating Systems", "OS", "os"],
        "DBMS": ["DBMS", "dbms"],
        "SQL": ["SQL", "sql"]
    }

    for main_skill, levels_dict in QUESTIONS_DATA.items():
        aliases = alias_map.get(main_skill, [main_skill])
        for target_skill in aliases:
            for level, q_list in levels_dict.items():
                for q in q_list:
                    txt = q["text"].strip()
                    if txt in existing_mcq_texts and target_skill == main_skill:
                        continue
                    
                    fp = make_fingerprint(txt)
                    mcq_insert_rows.append({
                        "skill_name": target_skill,
                        "difficulty_level": level,
                        "question_base_text": txt,
                        "options_json": {
                            "choices": q["options"],
                            "topic": q.get("topic", main_skill),
                            "fingerprint": fp
                        },
                        "correct_answer": q["answer"],
                        "usage_count": 0
                    })

    for main_skill, c_list in CODING_DATA.items():
        aliases = alias_map.get(main_skill, [main_skill])
        for target_skill in aliases:
            for c in c_list:
                txt = c["text"].strip()
                if txt in existing_coding_texts and target_skill == main_skill:
                    continue

                coding_insert_rows.append({
                    "skill_name": target_skill,
                    "difficulty_level": c["difficulty"],
                    "question_base_text": txt,
                    "starter_code": c["starter"],
                    "correct_answer": c["answer"],
                    "topic": c.get("topic", main_skill)
                })

    print(f"Prepared {len(mcq_insert_rows)} MCQ rows to insert.")
    print(f"Prepared {len(coding_insert_rows)} Coding rows to insert.")

    # Batch insert MCQs
    batch_size = 50
    inserted_mcqs = 0
    for i in range(0, len(mcq_insert_rows), batch_size):
        chunk = mcq_insert_rows[i:i + batch_size]
        res = supabase.table("questions").insert(chunk).execute()
        if hasattr(res, "data"):
            inserted_mcqs += len(res.data)
            print(f"Inserted MCQs: {inserted_mcqs}/{len(mcq_insert_rows)}")

    # Batch insert Coding questions
    inserted_codings = 0
    for i in range(0, len(coding_insert_rows), batch_size):
        chunk = coding_insert_rows[i:i + batch_size]
        res = supabase.table("coding_questions").insert(chunk).execute()
        if hasattr(res, "data"):
            inserted_codings += len(res.data)
            print(f"Inserted Coding Qs: {inserted_codings}/{len(coding_insert_rows)}")

    print("====================================================")
    print(f"SUCCESS: Seeded {inserted_mcqs} MCQs and {inserted_codings} Coding Questions across all 11 skills!")
    print("====================================================")

if __name__ == "__main__":
    seed_all()
