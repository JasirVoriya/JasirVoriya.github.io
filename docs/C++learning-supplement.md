---
tags:
  - C++
---
# C++ 查漏补缺
## 引用变量
### 引用的本质
```c++
int main(){
    int a=10;
    //编译器会编译成 int const *ref=&a;
    int &ref=a;
    //编译器会编译成 *ref=20;
    ref=20;
}
```
引用变量其实就是常量指针，编译器屏蔽了指针的用法，方便我们开发。
### 引用变量作为返回值
```c++
//返回静态变量a的引用
int& fun1(){
    static int a=10;
    return a;
}
//返回局部变量a的引用
int& fun2(){
    int a=10;
    return a;
}
int main(){
    //因为引用的本质是常量指针，所以这里ref2的指向内存已经被释放掉了，是一个非法地址，而fun1因为返回的是静态变量的引用，内存没有释放，所以是合法的。
    int& ref1=fun1();
    int& ref2=fun2();
    //我们还可以将函数调用作为左值：
    fun1()=1000;
    //还是因为，引用本质是常量指针，所以我们可以根据引用来修改对应的值，这和下面代码是等价的：
    ref1=1000;
}
```
## 常量const
### 常量方法
使用const修饰的成员方法，是不能够对成员变量进行修改的：
```c++
class Person{
public:
    int age;
    //方法后面加上一个const，表示是一个常量方法
    void showPerson() const{
        //这行代码编译报错，因为常量方法不允许修改成员变量
        this->age=1000;
    }
};
```
常量方法可以的解释如下：
我们知道，this是一个常量指针，指向当前对象，他不可被修改，和下面的定义类似：
```c++
//const 修饰的是this，表示this指针是不变的
Person* const this;
```
常量方法里面，其实是在方法范围内，让this变成一个常对象指针，使得this指向的值也不可以修改，和下面定义类似：
```c++
//const 修饰Person，表示Person的数据是不变的
const Person* const this;
```
但是我们可以用`mutable`关键字修饰成员变量，让他在常量方法里面也能被修改：
```c++
class Person{
public:
    mutable int age;
    //方法后面加上一个const，表示是一个常量方法
    void showPerson() const{
        //因为是mutable变量，所以可以修改
        this->age=1000;
    }
};
```
### 常对象
上面其实已经介绍过了，常量方法里面的this，就是一个常对象的指针。常对象只能调用常方法，不能调用普通方法（因为普通方法可能存在对成员变量对修改，所以c++禁止调用）：
```C++
class Person{
public:
    int age;
    mutable int height;
    //常方法
    void showPerson() const{
        height=100;
    }
    //普通方法
    void method(){

    }
    
};
//在对象前加上const，变为常对象
const Person p;
p.age=1000;//报错
p.height=180;//不报错

p.method();//报错
p.showPerson();//不报错
```
