export const enum ShapeFlags {
  ELEMENT = 1, // 0001
  STATEFUL_COMPONENT = 1 << 1, // 0010
  TEXT_CHILDREN = 1 << 2, // 0100
  ARRAY_CHILDREN = 1 << 3, // 1000
  SLOT_CHILDREN = 1 << 4,
}

/* 
&: 都为1才为1
|: 有一方1即为1
  标签元素：
    xxxx & 0001 = 1
    文本：
      xxxx & 0101
    数组：
      xxxx & 1001
  
  组件：
    xxxx & 0010 = 1
    文本：
      xxxx & 0110
    数组：
      xxxx & 1010
*/
