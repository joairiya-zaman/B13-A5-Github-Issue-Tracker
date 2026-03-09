## Answers to Questions

**1️⃣ What is the difference between var, let, and const?**

`var` is the older way of declaring variables. This means a variable declared with var can be accessed anywhere inside the function where it was created. It can also be redeclared and updated.

`let` has block scope, meaning the variable only exists inside the block where it is defined, such as inside a loop or conditional statement. A variable declared with let can be updated but cannot be redeclared in the same scope.

`const` is also block scoped like let, but it is used for variables whose values should not change after they are assigned. Once a value is assigned to a const variable, it cannot be reassigned later.



**2️⃣ What is the spread operator (...)?**

The spread operator is written with three dots. It is used to expand or spread the elements of an array or the properties of an object into another array or object.



**3️⃣ What is the difference between map(), filter(), and forEach()?**

`Map()` goes through each element of an array and creates a new array based on the results of some transformation. The original array remains unchanged.

`Filter()` also goes through the array but it selects only the elements that match a certain condition and returns a new array with those elements.

`ForEach()` simply runs a function for every element in the array. It does not return a new array.



**4️⃣ What is an arrow function?**

An arrow function is a shorter and more modern way of writing functions in JavaScript. It was introduced in ES6 to make function syntax simpler and more readable.



**5️⃣ What are template literals?**

Template literals are a modern way of working with strings in JavaScript. They allow developers to create strings that can include variables or expressions directly inside the text.