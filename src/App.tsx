/* eslint-disable max-len */
/* eslint-disable jsx-a11y/control-has-associated-label */
// import React from 'react';
// import { UserWarning } from './UserWarning';

// const USER_ID = 0;

// export const App: React.FC = () => {
//   if (!USER_ID) {
//     return <UserWarning />;
//   }

//   return (
//     <section className="section container">
//       <p className="title is-4">
//         Copy all you need from the prev task:
//         <br />
//         <a href="https://github.com/mate-academy/react_todo-app-add-and-delete#react-todo-app-add-and-delete">
//           React Todo App - Add and Delete
//         </a>
//       </p>

//       <p className="subtitle">Styles are already copied</p>
//     </section>
//   );
// };

/* eslint-disable max-len */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import * as todoServise from './api/todos';
import { Todo } from './types/Todo';
import {
  DeletionResult,
  DeletionSucces,
  UpdatingResult,
  UpdatingSucces,
} from './types/Deletion';
import { ErrorText } from './types/enums/ErrorText';
import { Filter } from './types/enums/Filter';
import { Header } from './Components/Header';
import { TodoList } from './Components/TodoList';
import { Footer } from './Components/Footer';
import { ErrorNotification } from './Components/ErrorNotification';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [errorMessage, setErrorMessage] = useState<ErrorText>(ErrorText.Init);
  const [activeLink, setActiveLink] = useState<Filter>(Filter.All);
  const [loadingTodoIds, setLoadingTodoIds] = useState<number[]>([]);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timerId = window.setTimeout(
      () => setErrorMessage(ErrorText.Init),
      3000,
    );

    return () => window.clearTimeout(timerId);
  }, [errorMessage]);

  useEffect(() => {
    todoServise
      .getTodos()
      .then(setTodos)
      .catch(() => setErrorMessage(ErrorText.UnableLoad));
  }, []);

  const filteredTodos = todos.filter(t => {
    if (activeLink === Filter.All) {
      return true;
    }

    if (activeLink === Filter.Active) {
      return !t.completed;
    }

    if (activeLink === Filter.Completed) {
      return t.completed;
    }

    return false;
  });

  function addTodo(trimmedTitle: string) {
    setErrorMessage(ErrorText.Init);
    if (!trimmedTitle) {
      return setErrorMessage(ErrorText.EmptyTitle);
    }

    const tempId = 0;
    const newTempTodo = {
      id: tempId,
      title: trimmedTitle,
      completed: false,
    };

    setTempTodo(newTempTodo);
    setLoadingTodoIds(prevIds => [...prevIds, newTempTodo.id]);

    return todoServise
      .createTodo(newTempTodo)
      .then(todoFromServer => {
        setTodos(prevTodos => [...prevTodos, todoFromServer]);
        setTempTodo(null);
      })
      .catch(error => {
        setErrorMessage(ErrorText.UnableAdd);
        setTempTodo(null);
        throw error;
      })
      .finally(() => {
        setLoadingTodoIds([]);
      });
  }

  function deleteTodo(todoId: number) {
    setErrorMessage(ErrorText.Init);
    setLoadingTodoIds(prevIds => [...prevIds, todoId]);

    return todoServise
      .deleteTodo(todoId)
      .then(() =>
        setTodos(currentTodos => currentTodos.filter(t => t.id !== todoId)),
      )
      .catch(error => {
        setErrorMessage(ErrorText.UnableDelete);
        throw error;
      })
      .finally(() => setLoadingTodoIds([]));
  }

  function updateTodo(updatedTodo: Todo) {
    setErrorMessage(ErrorText.Init);
    setLoadingTodoIds(prevIds => [...prevIds, updatedTodo.id]);

    return todoServise
      .updateTodo(updatedTodo)
      .then(todoFromServer => {
        setTodos((prevTodos: Todo[]) => {
          return prevTodos.map(prevTodo =>
            prevTodo.id === todoFromServer.id ? todoFromServer : prevTodo,
          );
        });
      })
      .catch(error => {
        setErrorMessage(ErrorText.UnableUpdate);
        setLoadingTodoIds([]);
        throw error;
      })
      .finally(() => setLoadingTodoIds([]));
  }

  function handleClearCompleted() {
    setErrorMessage(ErrorText.Init);

    const completedTodos = todos.filter(t => t.completed);

    setLoadingTodoIds(completedTodos.map(t => t.id));

    const deletionPromises: Promise<DeletionResult>[] = completedTodos.map(
      todo =>
        todoServise
          .deleteTodo(todo.id)
          .then((): DeletionSucces => {})
          .catch(() => {
            return { error: true, todo };
          }),
    );

    Promise.all<DeletionResult>(deletionPromises)
      .then(results => {
        const failedDeletions = results.filter(
          result => result && result.error,
        );

        if (failedDeletions.length > 0) {
          setErrorMessage(ErrorText.UnableDelete);
          const failedIds = failedDeletions.map(res => res?.todo.id);

          setTodos(prevTodos =>
            prevTodos.filter(
              todo => !todo.completed || failedIds.includes(todo.id),
            ),
          );
        } else {
          setTodos(prevTodos => prevTodos.filter(todo => !todo.completed));
        }
      })
      .finally(() => {
        setLoadingTodoIds([]);
      });
  }

  function handleToggleCheckboxes() {
    setErrorMessage(ErrorText.Init);

    // 1. Визначаємо цільовий статус
    const activeTodos = filteredTodos.filter(todo => !todo.completed);
    const targetCompletedStatus = activeTodos.length > 0; // true, якщо є незавершені (тобто "виконати всі"), false, якщо всі виконані (тобто "скасувати виконання всіх")

    // 2. ФІЛЬТРУЄМО завдання, які ПОТРЕБУЮТЬ зміни
    const todosToUpdate = filteredTodos.filter(
      todo => todo.completed !== targetCompletedStatus,
    );

    // Якщо немає завдань для оновлення, просто виходимо
    if (todosToUpdate.length === 0) {
      setLoadingTodoIds([]);
      return;
    }

    // 3. Створюємо новий список завдань для оновлення (з новим статусом)
    const updatedTodos = todosToUpdate.map(todo => ({
      ...todo,
      completed: targetCompletedStatus,
    }));

    // 4. Встановлюємо лоадер лише для тих завдань, які оновлюються
    setLoadingTodoIds(updatedTodos.map(todo => todo.id));

    // 5. Відправляємо API-запити ТІЛЬКИ для відфільтрованого списку
    const todoUpdatePromises: Promise<UpdatingResult>[] = updatedTodos.map(
      todo => {
        // Тут ми знаємо, що стан ЗАВЖДИ має бути змінений
        return todoServise
          .updateTodo(todo)
          .then((updatedTodo): UpdatingSucces => updatedTodo)
          .catch(() => {
            return { error: true, todo }; // Повертаємо оригінальне завдання у разі помилки
          });
      },
    );

    Promise.all(todoUpdatePromises)
      .then(results => {
        const failedUpdatingTodos = results.filter(result => result.error);
        const successfulUpdatingTodos = results.filter(
          result => !result.error,
        ) as UpdatingSucces[];

        if (failedUpdatingTodos.length > 0) {
          setErrorMessage(ErrorText.UnableUpdate);
        }

        // Оновлюємо стан: замінюємо успішно оновлені завдання і залишаємо незмінними ті, що не оновлювалися або провалилися
        setTodos(prevTodos => {
          // Завдання, які не оновлювалися (їх статус вже був цільовим)
          const unchangedTodos = filteredTodos.filter(
            todo => todo.completed === targetCompletedStatus,
          );

          // Завдання, які провалилися (їх потрібно повернути до попереднього стану)
          const failedOriginalTodos = failedUpdatingTodos.map(failedResult => {
            return (
              prevTodos.find(t => t.id === failedResult.todo.id) ||
              failedResult.todo
            ); // Повертаємо старе, або те, яке було до спроби
          });

          // Комбінуємо всі списки
          const newTodosMap = new Map();

          // Додаємо успішно оновлені
          successfulUpdatingTodos.forEach(todo =>
            newTodosMap.set(todo.id, todo),
          );

          // Додаємо ті, що не оновлювалися (вони вже мають правильний цільовий статус)
          unchangedTodos.forEach(todo => newTodosMap.set(todo.id, todo));

          // Додаємо ті, що провалилися (їхній стан залишається попереднім)
          failedOriginalTodos.forEach(todo => newTodosMap.set(todo.id, todo));

          // Збираємо кінцевий список, зберігаючи порядок оригінальних Todos
          return prevTodos.map(
            prevTodo => newTodosMap.get(prevTodo.id) || prevTodo,
          );
        });
      })
      .finally(() => setLoadingTodoIds([]));
  }

  return (
    <div className={classNames('todoapp', { 'has-error': errorMessage })}>
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <Header
          todos={todos}
          loadingTodoIds={loadingTodoIds}
          onAddTodo={titleTrimmed => addTodo(titleTrimmed)}
          onChangeCheckboxes={handleToggleCheckboxes}
        />

        <TodoList
          todos={filteredTodos}
          loadingTodoIds={loadingTodoIds}
          tempTodo={tempTodo}
          onUpdateTodo={updateTodo}
          onDeleteTodo={todoId => deleteTodo(todoId)}
        />

        {todos.length > 0 && (
          <Footer
            todos={filteredTodos}
            activeTodoCount={
              todos.filter((todo: Todo) => !todo.completed).length
            }
            activeLink={activeLink}
            onChangeActiveLink={setActiveLink}
            onClearCompleted={handleClearCompleted}
          />
        )}
      </div>

      {/* DON'T use conditional rendering to hide the notification */}
      {/* Add the 'hidden' class to hide the message smoothly */}

      <ErrorNotification
        errorMessage={errorMessage}
        onChangeErrorMessage={setErrorMessage}
      />
    </div>
  );
};
